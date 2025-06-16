//** UTILS */
import { uploadToSeaweed } from '../utils/file.seaweed';

//** INTERFACES */
import type { SuccessMessage } from '../onchain.services/onchain.interface';

//** BUN */
import { nanoid } from 'nanoid';
import type { Driver, Session, QueryResult, ManagedTransaction } from 'neo4j-driver';
import type { CreatePostBody, FeedPost, GetPostResult } from './post.interface';

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
     * Retrieves a post by its ID, including author, like count, comment count, and shared post details if applicable.
     *
     * @param token - The access token of the current user, or null if unauthenticated.
     * @param postId - The unique identifier of the post to retrieve.
     * @returns A promise that resolves to an object containing post details, including:
     *   - id: The post's unique identifier.
     *   - content: The content of the post.
     *   - imageUrl: The image URL associated with the post.
     *   - createdAt: The creation timestamp of the post.
     *   - author: The username of the post's author.
     *   - likeCount: The number of likes on the post.
     *   - commentCount: The number of comments on the post.
     *   - likedByCurrentUser: Whether the current user has liked the post.
     *   - sharedPost (optional): Details of the original post if this post is a share, including id, content, imageUrl, createdAt, and author.
     * @throws Error if the post is not found or if there is a failure retrieving the post.
     */
    public async getPost(token: string | null, postId: string): Promise<GetPostResult> {
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
                    OPTIONAL MATCH (p)-[:SHARED]->(original:Post)<-[:POSTED]-(originalAuthor:User)

                    RETURN 
                        p.id AS id,
                        p.content AS content,
                        p.imageUrl AS imageUrl,
                        p.createdAt AS createdAt,
                        author.username AS author,
                        COUNT(DISTINCT liker) AS likeCount,
                        COUNT(DISTINCT comment) AS commentCount,
                        ANY(likerName IN COLLECT(liker.username) WHERE likerName = $username) AS likedByCurrentUser,
                        
                        original.id AS originalPostId,
                        original.content AS originalContent,
                        original.imageUrl AS originalImageUrl,
                        original.createdAt AS originalCreatedAt,
                        originalAuthor.username AS originalAuthor
                    `,
                    { postId, username }
                )
            );

            if (!result.records.length) {
                throw new Error('Post not found.');
            }

            const record = result.records[0];

            const postData: GetPostResult = {
                id: record.get('id'),
                content: record.get('content'),
                imageUrl: record.get('imageUrl'),
                createdAt: record.get('createdAt'),
                author: record.get('author'),
                likeCount: record.get('likeCount').toNumber?.() ?? 0,
                commentCount: record.get('commentCount').toNumber?.() ?? 0,
                likedByCurrentUser: record.get('likedByCurrentUser') ?? false,
            };

            const originalPostId = record.get('originalPostId');
            if (originalPostId) {
                postData.sharedPost = {
                    id: originalPostId,
                    content: record.get('originalContent'),
                    imageUrl: record.get('originalImageUrl'),
                    createdAt: record.get('originalCreatedAt'),
                    author: record.get('originalAuthor')
                };
            }

            return postData;
        } catch (error) {
            console.error('Error retrieving post:', error);
            throw new Error('Failed to retrieve post.');
        } finally {
            await session?.close();
        }
    }


    public async getPostsForFeed(token: string, page = 1, limit = 20): Promise<FeedPost[]> {
        const session = this.driver?.session();
        if (!session) throw new Error('Unable to create database session');

        const skip = (page - 1) * limit;

        try {
            const tokenService = new TokenService();
            const username = await tokenService.verifyAccessToken(token);

            const result = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(
                    `
                    MATCH (me:User {username: $username})
                    MATCH (author:User)-[:POSTED]->(p:Post)
                    WHERE author.username <> $username AND (NOT EXISTS(p.deleted) OR p.deleted = false)

                    OPTIONAL MATCH (p)<-[:LIKED]-(liker:User)
                    OPTIONAL MATCH (p)<-[:ON]-(comment:Comment)
                    OPTIONAL MATCH (p)-[:SHARED]->(original:Post)<-[:POSTED]-(originalAuthor:User)
                    OPTIONAL MATCH (me)-[:FOLLOWS]->(author)

                    WITH 
                        p,
                        author,
                        original,
                        originalAuthor,
                        COUNT(DISTINCT liker) AS likeCount,
                        COUNT(DISTINCT comment) AS commentCount,
                        (CASE WHEN original IS NULL THEN false ELSE true END) AS isShared,
                        (CASE WHEN (me)-[:FOLLOWS]->(author) THEN 1 ELSE 0 END) AS isFollowing,
                        datetime().epochSeconds - p.createdAt.epochSeconds AS ageInSeconds

                    WITH p, author, original, originalAuthor, likeCount, commentCount, isShared, isFollowing, ageInSeconds,
                        (likeCount * 3 + commentCount * 2 + isFollowing * 10 - ageInSeconds / 600) AS score

                    RETURN 
                        p.id AS id,
                        p.content AS content,
                        p.imageUrl AS imageUrl,
                        p.createdAt AS createdAt,
                        author.username AS author,
                        likeCount,
                        commentCount,
                        isShared,
                        original.id AS originalPostId,
                        original.content AS originalContent,
                        original.imageUrl AS originalImageUrl,
                        original.createdAt AS originalCreatedAt,
                        originalAuthor.username AS originalAuthor,
                        score

                    ORDER BY score DESC
                    SKIP $skip
                    LIMIT $limit
                    `,
                    { username, skip, limit }
                )
            );

            return result.records.map((record) => {
                const post: FeedPost = {
                    id: record.get('id'),
                    content: record.get('content'),
                    imageUrl: record.get('imageUrl'),
                    createdAt: record.get('createdAt'),
                    author: record.get('author'),
                    likeCount: record.get('likeCount').toNumber?.() ?? 0,
                    commentCount: record.get('commentCount').toNumber?.() ?? 0,
                    isShared: record.get('isShared'),
                };

                if (record.get('originalPostId')) {
                    post.sharedPost = {
                        id: record.get('originalPostId'),
                        content: record.get('originalContent'),
                        imageUrl: record.get('originalImageUrl'),
                        createdAt: record.get('originalCreatedAt'),
                        author: record.get('originalAuthor'),
                    };
                }

                return post;
            });
        } catch (err) {
            console.error('Error generating feed:', err);
            throw new Error('Failed to load feed');
        } finally {
            await session?.close();
        }
    }




    /**
     * Shares an existing post by creating a new shared post linked to the original.
     *
     * @param token - The JWT access token of the user sharing the post.
     * @param originalPostId - The ID of the post to be shared.
     * @param content - Optional content to include with the shared post.
     * @returns A promise that resolves to a success message if the post is shared successfully.
     * @throws Will throw an error if the database session cannot be created, the token is invalid, or the post cannot be shared.
     */
    public async sharePost(token: string, originalPostId: string, content?: string): Promise<SuccessMessage> {
	const session: Session | undefined = this.driver?.session();
	if (!session) throw new Error('Unable to create database session.');

	try {
		const tokenService = new TokenService();
		const username = await tokenService.verifyAccessToken(token);

		const newPostId = nanoid();
		const createdAt = new Date().toISOString();

		const result = await session.executeWrite((tx: ManagedTransaction) =>
			tx.run(
				`
				MATCH (u:User {username: $username})
				MATCH (original:Post {id: $originalPostId})
				WHERE NOT EXISTS(original.deleted) OR original.deleted = false

				CREATE (u)-[:POSTED]->(shared:Post {
					id: $newPostId,
					content: $content,
					createdAt: datetime($createdAt),
					isShared: true
				})
				CREATE (shared)-[:SHARED]->(original)

				RETURN shared.id AS id
				`,
				{
					username,
					originalPostId,
					newPostId,
					content: content ?? '',
					createdAt
				}
			)
		);

		if (result.records.length === 0) throw new Error('Failed to share post.');
		return { success: 'Post shared successfully.' };

	} catch (error) {
		console.error('Error sharing post:', error);
		throw new Error('Failed to share post.');
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
