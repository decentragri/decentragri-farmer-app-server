import type { WalletData } from "../wallet.services/wallet.interface";


/**
 * Represents the data required for registering a new user.
 *
 * @property username - The unique username chosen by the user.
 * @property password - The password for the user's account.
 * @property deviceId - The identifier of the device used for registration.
 */
export interface UserRegistration {
    username: string;
    password: string;
    deviceId: string;
}

/**
 * Represents the credentials required for a user to log in.
 *
 * @property username - The unique identifier or username of the user.
 * @property password - The user's password.
 */
export interface userLogin {
    username: string;
    password: string;
}

/**
 * Represents the response returned after a user successfully logs in.
 *
 * @property username - The username of the authenticated user.
 * @property walletAddress - The blockchain wallet address associated with the user.
 * @property accessToken - The JWT access token for authentication.
 * @property refreshToken - The JWT refresh token for session renewal.
 * @property loginType - The type of login used; currently only 'decentragri' is supported.
 * @property walletData - Additional data related to the user's wallet.
 * @property level - The user's current level (defaults to 1 if not specified).
 * @property experience - The user's current experience points (defaults to 0 if not specified).
 * @property createdAt - (Optional) The ISO date string representing when the user was created.
 * @property rank - (Optional) The user's rank in the system.
 */
export interface UserLoginResponse {
    username: string;
    walletAddress: string;
    accessToken: string;
    refreshToken: string;
    loginType: 'decentragri';
    walletData: WalletData,
    level: number | 1;
    experience: number | 0;

    createdAt?: string;
    rank?: number; 
}


/**
 * Represents an object containing buffer data as a string.
 *
 * @property bufferData - The buffer data encoded as a string.
 */
export interface BufferData {
    bufferData: string;
  }