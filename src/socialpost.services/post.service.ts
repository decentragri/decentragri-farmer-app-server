import { uploadToSeaweed } from '../utils/file.seaweed';

//** INTERFACES */
import type { SuccessMessage } from '../onchain.services/onchain.interface';

//** BUN */
import { nanoid } from 'nanoid';
import type { Driver, Session, QueryResult, ManagedTransaction } from 'neo4j-driver';

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
	public async createPost(username: string, body: { content: string; image?: string }): Promise<SuccessMessage> {
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
}

export default SocialPostService;
