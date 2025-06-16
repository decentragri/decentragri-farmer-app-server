

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