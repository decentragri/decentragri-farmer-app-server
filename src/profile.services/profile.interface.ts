import type { UserLoginResponse } from "../auth.services/auth.interface";

/**
 * Represents the result of a level-up operation for a user profile.
 *
 * @property currentLevel - The user's new level after leveling up.
 * @property currentExperience - The user's current experience points after the level-up.
 * @property experienceGained - The amount of experience gained during the level-up.
 */
export interface LevelUpResult {
    currentLevel: number;
    currentExperience: number;
    experienceGained: number;
}

/**
 * Represents the response object for a user's profile, extending the user login response.
 *
 * @extends UserLoginResponse
 * @property {number} farmCount - The total number of farms associated with the user.
 * @property {number} plantScanCount - The total number of plant scans performed by the user.
 * @property {number} readingCount - The total number of readings recorded by the user.
 * @property {string | null} image - The URL of the user's profile image, or null if not set.
 */
export interface UserProfileResponse extends UserLoginResponse {
    farmCount: number;
    plantScanCount: number;
    readingCount: number;
    image: string | null;
}