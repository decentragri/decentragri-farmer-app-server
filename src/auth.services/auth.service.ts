
//** MEMGRAPH DRIVER
import { Driver, ManagedTransaction } from 'neo4j-driver-core'

//** BCRYPT IMPORT
import { hash, compare } from 'bcrypt-ts'

//** UUID GENERATOR
import { nanoid } from "nanoid"

//**TYPE IMPORTS */
import type { userLogin, UserLoginResponse, UserRegistration } from './auth.interface';
import type { TokenScheme } from '../security.services/security.service.interface';

//**SERVICE IMPORT
import WalletService from '../wallet.services/wallet.service';
import TokenService from '../security.services/token.service';

//** CONFIG IMPORT */
import { SALT_ROUNDS } from '../utils/constants';
import type { SuccessMessage } from '../onchain.services/onchain.interface';


class AuthService {
    driver?: Driver
    constructor(driver?: Driver) {
      this.driver = driver
      };


    /**
     * Registers a new user by creating a new node in the database and generating tokens.
     * @param user - The user registration data containing username, password, and deviceId.
     * @returns An object containing the username, wallet address, access token, and refresh token.
     */
    public async register(user: UserRegistration): Promise<UserLoginResponse> {
        const { username, password, deviceId } = user;

        const walletService = new WalletService(this.driver);
        const tokenService = new TokenService();

        const userId: string = nanoid();
        const session = this.driver?.session();

        if (!session) throw { error: "Database session not available" };

        try {
            // Parallelize password hashing and wallet creation
            const [encryptedPassword, walletAddress] = await Promise.all([
                hash(password, parseInt(SALT_ROUNDS)),
                walletService.createWallet(username),
            ]);
            const createdAt = new Date().toISOString();

            await session.executeWrite((tx: ManagedTransaction) =>
                tx.run(
                    `
                    CREATE (u:User {
                        userId: $userId,
                        username: $username,
                        password: $encryptedPassword,
                        deviceId: $deviceId,
                        walletAddress: $walletAddress,
                        level: 1,
                        experience: 0,
                        userExperience: 0,
                        createdAt: $createdAt,
                        rank: 1
                    })`,
                    { userId, username, encryptedPassword, deviceId, walletAddress, createdAt }
                )
            );

            // Generate tokens after user creation
            const [tokens, walletData] = await Promise.all([
                tokenService.generateTokens(username),
                walletService.getWalletBalance(walletAddress)
            ]);

            const { accessToken, refreshToken } = tokens;
            return {
                username,
                walletAddress,
                accessToken,
                refreshToken,
                loginType: "decentragri",
                walletData,
                level: 1,
                experience: 0,

            };

        } catch (error: any) {
            console.error("Error registering user:", error);
            
            if (
                error.code === "Neo.ClientError.Schema.ConstraintValidationFailed" &&
                error.message.includes("username")
            ) {
                throw { error: `An account already exists with the username "${username}"` };
            }

            if (typeof error === "string") {
                throw { error };
            }

            throw { error: "Failed to register user." };
        } finally {
            await session.close();
        }
    }


    /**
     * Logs in a user by verifying their credentials and generating tokens.
     * @param loginData - The login data containing username and password.
     * @returns An object containing the username, wallet address, access token, and refresh token.
     */
    public async login(loginData: userLogin): Promise<UserLoginResponse> {
        const { username, password } = loginData;
        const session = this.driver?.session();
        const tokenService = new TokenService();
        const walletService = new WalletService(this.driver);

        if (!session) throw { error: "Database session not available" };

        try {
            const result = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})
                    RETURN u.password AS password, u.walletAddress AS walletAddress, u.level AS level, u.experience AS experience, u.userExperience AS userExperience
                    `,
                    { username }
                )
            );

            if (result.records.length === 0) {
                throw { error: "Invalid username or password" };
            }

            const storedPassword = result.records[0].get("password");
            const walletAddress = result.records[0].get("walletAddress");
            const level = result.records[0].get("level");
            const experience = result.records[0].get("experience");

            const isPasswordValid = await compare(password, storedPassword);
            if (!isPasswordValid) {
                throw { error: "Invalid username or password" };
            }

            const [tokens, walletData] = await Promise.all([
                tokenService.generateTokens(username),
                walletService.getWalletBalance(walletAddress)
            ]);

            const { accessToken, refreshToken } = tokens;
            return {
                username,
                walletAddress,
                accessToken,
                refreshToken,
                loginType: "decentragri",
                walletData,
                level,
                experience,

            };
        } catch (error: any) {
            console.error("Error logging in:", error);
            // Pass error as-is if already formatted
            if (typeof error === "object" && error.error) throw error;
            throw { error: "Login failed" };
        } finally {
            await session.close();
        }
    }

    
    /**
     * Validates a session by verifying the refresh token and checking if the user exists.
     * @param token - The refresh token to validate.
     * @returns An object containing the username, wallet address, access token, and refresh token.
     */
    public async validateSession(token: string): Promise<UserLoginResponse> {
        const tokenService = new TokenService();
        const session = this.driver?.session();
        const walletService = new WalletService(this.driver);

        if (!session) throw { error: "Database session not available" };

        try {
            const tokens: TokenScheme = await tokenService.verifyRefreshToken(token);
            
            const result = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(
                    `
                    MATCH (u:User {username: $userName})
                    RETURN u
                    `,
                    { userName: tokens.userName }
                )
            );

            if (result.records.length === 0) {
                throw { error: "User not found" };
            }

            const user = result.records[0].get("u").properties;
            const walletAddress: string = user.walletAddress;
            const level = user.level;
            const experience = user.experience;


            const [walletData] = await Promise.all([
                walletService.getWalletBalance(walletAddress)
            ]);

            const { accessToken, refreshToken } = tokens;
            return {
                username: tokens.userName,
                walletAddress,
                accessToken,
                refreshToken,
                loginType: "decentragri",
                walletData,
                level,
                experience,
            };
        } catch (error: any) {
            console.error("Error validating session:", error);

            if (error?.error) {
                throw error;
            }

            if (typeof error === "string") {
                throw { error };
            }

            throw { error: "Invalid session" };
        } finally {
            await session.close();
        }
    }


    /**
     * Refreshes the session by verifying the refresh token and generating new tokens.
     * @param token - The refresh token to verify.
     * @returns An object containing the username, wallet address, access token, and refresh token.
     */
    public async refreshSession(token: string): Promise<TokenScheme> {
        const tokenService = new TokenService();
        try {
            const tokens: TokenScheme = await tokenService.verifyRefreshToken(token);
            return tokens;
        } catch (error: any) {
            console.error("Error refreshing session:", error);
            throw new error
        }
    }


    public async saveFcmToken(token: string, body: { token: string }): Promise<SuccessMessage> {
        const session = this.driver?.session();
        const tokenService = new TokenService();

        if (!session) throw { error: "Database session not available" };

        try {
            const username: string = await tokenService.verifyAccessToken(token);


            await session.executeWrite((tx: ManagedTransaction) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})
                    SET u.fcmToken = $fcmToken
                    `,
                    { username, fcmToken: body.token }
                )
            );

            return { success: "FCM token saved" };
        } catch (error: any) {
            console.error("Error saving FCM token:", error);
            throw { error: "Failed to save FCM token" };
        } finally {
            await session.close();
        }
    }





}

export default AuthService;