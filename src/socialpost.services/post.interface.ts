

/**
 * Represents the payload required to create a new social post.
 *
 * @property content - The textual content of the post.
 * @property image - Stringified JSON array of numbers representing the image bytes (optional).
 * If provided, this should be a valid PNG image encoded as a JSON array of numbers.
 */
export interface CreatePostBody {
    content: string;
    image?: string;
}


/**
 * Represents the details of a shared social post.
 *
 * @property id - The unique identifier of the post.
 * @property content - The textual content of the post.
 * @property imageUrl - The URL of the image associated with the post, or null if there is no image.
 * @property createdAt - The ISO string representing the date and time when the post was created.
 * @property author - The identifier or name of the author who created the post.
 */
export interface SharedPostDetails {
    id: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    author: string;
}

/**
 * Represents the result of fetching a social post.
 *
 * @property id - Unique identifier for the post.
 * @property content - The textual content of the post.
 * @property imageUrl - URL of the image attached to the post, or null if none.
 * @property createdAt - ISO string representing when the post was created.
 * @property author - Identifier or name of the post's author.
 * @property likeCount - Number of likes the post has received.
 * @property commentCount - Number of comments on the post.
 * @property likedByCurrentUser - Indicates if the current user has liked the post.
 * @property sharedPost - Optional details about the original post if this is a shared post.
 */
export interface GetPostResult {
    id: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    author: string;
    likeCount: number;
    commentCount: number;
    likedByCurrentUser: boolean;
    sharedPost?: SharedPostDetails;
}



/**
 * Represents a post that has been shared on the social platform.
 *
 * @property id - The unique identifier for the shared post.
 * @property content - The textual content of the post.
 * @property imageUrl - The URL of an image associated with the post, or null if there is no image.
 * @property createdAt - The ISO string representing when the post was created.
 * @property author - The identifier or name of the author who shared the post.
 */
export interface SharedPost {
	id: string;
	content: string;
	imageUrl: string | null;
	createdAt: string;
	author: string;
}

/**
 * Represents a post in the feed.
 *
 * @property id - Unique identifier for the post.
 * @property content - The textual content of the post.
 * @property imageUrl - URL of the image associated with the post, or null if none.
 * @property createdAt - ISO string representing the creation date and time of the post.
 * @property author - Identifier or name of the post's author.
 * @property likeCount - Number of likes the post has received.
 * @property commentCount - Number of comments on the post.
 * @property isShared - Indicates if the post is a shared post.
 * @property sharedPost - The original post that was shared, if applicable.
 */
export interface FeedPost {
	id: string;
	content: string;
	imageUrl: string | null;
	createdAt: string;
	author: string;
	likeCount: number;
	commentCount: number;
	isShared: boolean;
	sharedPost?: SharedPost;
}
