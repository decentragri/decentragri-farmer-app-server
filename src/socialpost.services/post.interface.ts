

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


export interface SharedPostDetails {
    id: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    author: string;
}

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