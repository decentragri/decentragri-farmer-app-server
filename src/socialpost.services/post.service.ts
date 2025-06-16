//** UTILS */
import { uploadToSeaweed } from '../utils/file.seaweed';

//** INTERFACES */
import type { SuccessMessage } from '../onchain.services/onchain.interface';

//** BUN */
import { nanoid } from 'nanoid';
import type { Driver, Session, QueryResult, ManagedTransaction } from 'neo4j-driver';
import type { CreatePostBody } from './post.interface';

//** SERVICES */
import TokenService from '../security.services/token.service';


class SocialPostService {
	driver?: Driver;
	constructor(driver?: Driver) {
		this.driver = driver;
	}

    /**
     * Creates a new post for the specified user, optionally including an image.
     *
     * @param username - The username of the user creating the post.
     * @param body - An object containing the post content and an optional image.
     * @param body.content - The textual content of the post.
     * @param body.image - (Optional) A JSON-encoded array of numbers representing the image bytes.
     * @returns A promise that resolves to a success message if the post is created successfully.
     * @throws Will throw an error if the database session cannot be created, if the image format is invalid,
     *         if the image byte values are invalid, or if the post creation fails.
     */
	public async createPost(token: string, body: CreatePostBody): Promise<SuccessMessage> {
        const tokenService = new TokenService();
        const username = await tokenService.verifyAccessToken(token);
        
		const session: Session | undefined = this.driver?.session();
		if (!session) throw new Error('Unable to create database session.');

		let imageUrl: string | null = null;
		const postId = nanoid();
		const createdAt = new Date().toISOString();

		try {
			if (body.image) {
				let byteArray: number[];
				try {
					byteArray = JSON.parse(body.image);
					if (!Array.isArray(byteArray)) throw new Error();
				} catch {
					throw new Error('Invalid image format: must be a JSON-encoded number array');
				}

				if (
					byteArray.length === 0 ||
					byteArray.some((n) => typeof n !== 'number' || n < 0 || n > 255)
				) {
					throw new Error('Invalid byte values in PackedByteArray');
				}

				const imageBuffer = Buffer.from(byteArray);
				const filename = `${username}_${createdAt}.png`;
				imageUrl = await uploadToSeaweed(imageBuffer, filename, 'image/png');
			}
			const result: QueryResult = await session.executeWrite((tx: ManagedTransaction) =>
				tx.run(
					`
                    MATCH (u:User {username: $username})
                    CREATE (u)-[:POSTED]->(p:Post {
                        id: $id,
                        content: $content,
                        imageUrl: $imageUrl,
                        createdAt: datetime($createdAt),
                    })
                    RETURN p
					`,
					{
						id: postId,
						username,
						content: body.content,
						imageUrl,
						createdAt
					}
				)
			);

			if (result.records.length > 0) {
				return { success: 'Post created successfully.' };
			} else {
				throw new Error('Failed to create post.');
			}
		} catch (error) {
			console.error('Error creating post:', error);
			throw new Error('Failed to create post.');
		} finally {
			await session?.close();
		}
	}


    /**
     * Retrieves a post by its ID, including its content, author, like count, comment count,
     * and whether the current user (identified by the provided token) has liked the post.
     *
     * @param token - The access token of the current user, or null if unauthenticated.
     * @param postId - The unique identifier of the post to retrieve.
     * @returns A promise that resolves to an object containing post details:
     *   - id: The post's unique identifier.
     *   - content: The content of the post.
     *   - imageUrl: The URL of the post's image, if any.
     *   - createdAt: The creation timestamp of the post.
     *   - author: The username of the post's author.
     *   - likeCount: The number of likes the post has received.
     *   - commentCount: The number of comments on the post.
     *   - likedByCurrentUser: Whether the current user has liked the post.
     * @throws Will throw an error if the post is not found or if retrieval fails.
     */
    public async getPost(token: string | null, postId: string): Promise<any> {
	const session: Session | undefined = this.driver?.session();
	if (!session) throw new Error('Unable to create database session.');

	try {
		let username: string | null = null;
		if (token) {
			const tokenService = new TokenService();
			username = await tokenService.verifyAccessToken(token);
		}

		const result: QueryResult = await session.executeRead((tx: ManagedTransaction) =>
			tx.run(
				`
                MATCH (p:Post {id: $postId})
                WHERE NOT EXISTS(p.deleted) OR p.deleted = false
                MATCH (p)<-[:POSTED]-(author:User)
                OPTIONAL MATCH (p)<-[:LIKED]-(liker:User)
                OPTIONAL MATCH (p)<-[:ON]-(comment:Comment)
                RETURN 
                    p.id AS id,
                    p.content AS content,
                    p.imageUrl AS imageUrl,
                    p.createdAt AS createdAt,
                    author.username AS author,
                    COUNT(DISTINCT liker) AS likeCount,
                    COUNT(DISTINCT comment) AS commentCount,
                    ANY(likerName IN COLLECT(liker.username) WHERE likerName = $username) AS likedByCurrentUser
				`,
				{ postId, username }
			)
		);

		if (!result.records.length) {
			throw new Error('Post not found.');
		}

		const record = result.records[0];

		return {
			id: record.get('id'),
			content: record.get('content'),
			imageUrl: record.get('imageUrl'),
			createdAt: record.get('createdAt'),
			author: record.get('author'),
			likeCount: record.get('likeCount').toNumber?.() ?? 0,
			commentCount: record.get('commentCount').toNumber?.() ?? 0,
			likedByCurrentUser: record.get('likedByCurrentUser') ?? false
		};
	} catch (error) {
		console.error('Error retrieving post:', error);
		throw new Error('Failed to retrieve post.');
	} finally {
		await session?.close();
	}
    }


    /**
     * Toggles the like status of a post for the authenticated user.
     *
     * If the user has already liked the post, this method will remove the like (unlike).
     * If the user has not liked the post, this method will add a like.
     *
     * @param token - The JWT access token of the user performing the action.
     * @param postId - The unique identifier of the post to like or unlike.
     * @returns A promise that resolves to a `SuccessMessage` indicating whether the post was liked or unliked.
     * @throws Will throw an error if the database session cannot be created, the token is invalid, or the operation fails.
     */
    public async likePost(token: string, postId: string): Promise<SuccessMessage> {
        const session: Session | undefined = this.driver?.session();
        if (!session) throw new Error('Unable to create database session.');

        try {
            const tokenService = new TokenService();
            const username = await tokenService.verifyAccessToken(token);

            const result = await session.executeWrite(async (tx: ManagedTransaction) => {
                // Check if LIKE already exists
                const existing = await tx.run(
                    `
                    MATCH (u:User {username: $username})-[l:LIKED]->(p:Post {id: $postId})
                    RETURN l
                    `,
                    { username, postId }
                );

                if (existing.records.length > 0) {
                    // User already liked the post → Unlike
                    await tx.run(
                        `
                        MATCH (u:User {username: $username})-[l:LIKED]->(p:Post {id: $postId})
                        DELETE l
                        `,
                        { username, postId }
                    );
                    return { success: 'Post unliked.' };
                } else {
                    // User hasn't liked the post → Like
                    await tx.run(
                        `
                        MATCH (u:User {username: $username}), (p:Post {id: $postId})
                        MERGE (u)-[l:LIKED]->(p)
                        ON CREATE SET l.createdAt = datetime()
                        `,
                        { username, postId }
                    );
                    return { success: 'Post liked.' };
                }
            });

            return result;
        } catch (error) {
            console.error('Error toggling like:', error);
            throw new Error('Failed to like/unlike post.');
        } finally {
            await session?.close();
        }
    }


    /**
     * Adds a comment to a post by a user identified via an access token.
     *
     * @param token - The JWT access token of the user making the comment.
     * @param postId - The unique identifier of the post to comment on.
     * @param commentText - The text content of the comment.
     * @returns A promise that resolves to a success message if the comment is added successfully.
     * @throws Will throw an error if the database session cannot be created, the token is invalid, or the comment cannot be added.
     */
    public async commentToPost(token: string, postId: string, commentText: string): Promise<SuccessMessage> {
	const session: Session | undefined = this.driver?.session();
	if (!session) throw new Error('Unable to create database session.');

	try {
		const tokenService = new TokenService();
		const username = await tokenService.verifyAccessToken(token);

		const commentId = nanoid();
		const createdAt = new Date().toISOString();

		await session.executeWrite((tx: ManagedTransaction) =>
			tx.run(
				`
				MATCH (u:User {username: $username}), (p:Post {id: $postId})
				CREATE (c:Comment {
					id: $commentId,
					text: $commentText,
					createdAt: datetime($createdAt),
					username: $username
				})
				MERGE (u)-[:COMMENTED]->(c)
				MERGE (c)-[:ON]->(p)
				`,
				{
					username,
					postId,
					commentId,
					commentText,
					createdAt
				}
			)
		);

		return { success: 'Comment added to post.' };
	} catch (error) {
		console.error('Error commenting on post:', error);
		throw new Error('Failed to add comment.');
	} finally {
		await session?.close();
	}
    }


    /**
     * Deletes a post created by the authenticated user, along with its related comments and likes.
     *
     * @param token - The JWT access token of the user requesting the deletion.
     * @param postId - The unique identifier of the post to be deleted.
     * @returns A promise that resolves to a success message if the post is deleted successfully.
     * @throws Will throw an error if the database session cannot be created, the post is not found,
     *         the user is not authorized, or if the deletion fails for any reason.
     */
    /**
     * Soft-deletes a post by setting its `deleted` property to `true`.
     * 
     * @param token - The JWT access token of the user requesting the deletion.
     * @param postId - The unique identifier of the post to be deleted.
     * @returns A promise that resolves to a `SuccessMessage` indicating the result of the operation.
     * @throws Will throw an error if the database session cannot be created, if the post is not found,
     *         if the user is not authorized, or if any other error occurs during the process.
     */
    public async deletePost(token: string, postId: string): Promise<SuccessMessage> {
        const session: Session | undefined = this.driver?.session();
        if (!session) throw new Error('Unable to create database session.');

        try {
            const tokenService = new TokenService();
            const username = await tokenService.verifyAccessToken(token);

            const result: QueryResult = await session.executeWrite((tx: ManagedTransaction) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})-[:POSTED]->(p:Post {id: $postId})
                    SET p.deleted = true
                    RETURN p.id AS id
                    `,
                    { username, postId }
                )
            );

            if (result.records.length > 0) {
                return { success: 'Post deleted successfully (soft delete).' };
            } else {
                throw new Error('Post not found or user not authorized.');
            }
        } catch (error) {
            console.error('Error soft-deleting post:', error);
            throw new Error('Failed to delete post.');
        } finally {
            await session?.close();
        }
    }

}

export default SocialPostService;
