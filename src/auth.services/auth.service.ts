
//** MEMGRAPH DRIVER
import { Driver, ManagedTransaction } from 'neo4j-driver-core'

//** BCRYPT IMPORT
import { hash, compare } from 'bcrypt-ts'

//** UUID GENERATOR
import { nanoid } from "nanoid"

//**TYPE IMPORTS */
import type { userLogin, userLoginResponse, userRegistration } from './auth.interface';
import type { TokenScheme } from '../security.services/security.service.interface';

//**SERVICE IMPORT
import WalletService from '../wallet.services/wallet.service';
import TokenService from '../security.services/token.service';

//** CONFIG IMPORT */
import { SALT_ROUNDS } from '../utils/constants';


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
    public async register(user: userRegistration): Promise<userLoginResponse> {
        const { username, password, deviceId } = user;
    
        const walletService = new WalletService(this.driver);
        const tokenService = new TokenService();

        const userId: string = nanoid();
        const session = this.driver?.session();
    
        if (!session) throw new Error("Database session not available");
    
        try {
            // Parallelize password hashing and wallet creation
            const [encryptedPassword, walletAddress] = await Promise.all([
                hash(password, parseInt(SALT_ROUNDS)),
                walletService.createWallet(username),
            ]);

            
    
            await session.executeWrite((tx: ManagedTransaction) =>
                tx.run(
                    `
                    CREATE (u:User {
                        userId: $userId,
                        username: $username,
                        password: $encryptedPassword,
                        deviceId: $deviceId,
                        walletAddress: $walletAddress
                    })
                    `,
                    { userId, username, encryptedPassword, deviceId, walletAddress }
                )
            );
            // Generate tokens after user creation
            const [tokens, walletData] = await Promise.all([
                tokenService.generateTokens(username),
                walletService.getWalletBalance(walletAddress)
            ]);
            
            const { accessToken, refreshToken } = tokens
            return { username,walletAddress, accessToken, refreshToken, loginType: 'decentragri', walletData};
        } catch (error: any) {
            console.error("Error registering user:", error);
            if (
                error.code === "Neo.ClientError.Schema.ConstraintValidationFailed" &&
                error.message.includes("username")
            ) {
                throw new Error(`An account already exists with the username "${username}"`);
            }
            throw new Error("Failed to register user");
        } finally {
            await session.close();
        }
    }


    /**
     * Logs in a user by verifying their credentials and generating tokens.
     * @param loginData - The login data containing username and password.
     * @returns An object containing the username, wallet address, access token, and refresh token.
     */
    public async login(loginData: userLogin): Promise<userLoginResponse> {
        const { username, password } = loginData;
        const session = this.driver?.session();
        const tokenService = new TokenService();
        const walletService = new WalletService(this.driver);
    
        if (!session) throw new Error("Database session not available");
    
        try {
            const result = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})
                    RETURN u.password AS password, u.walletAddress AS walletAddress
                    `,
                    { username }
                )
            );
    
            if (result.records.length === 0) {
                throw new Error("Invalid username or password");
            }
    
            const storedPassword = result.records[0].get("password");
            const walletAddress = result.records[0].get("walletAddress");
    
            const isPasswordValid = await compare(password, storedPassword);
    
            if (!isPasswordValid) {
                throw new Error("Invalid username or password");
            }
    
            // Run token generation and wallet data fetch in parallel
            const [tokens, walletData] = await Promise.all([
                tokenService.generateTokens(username),
                walletService.getWalletBalance(walletAddress)
            ]);
            
            const { accessToken, refreshToken } = tokens
            return { username,walletAddress, accessToken, refreshToken, loginType: 'decentragri', walletData};
        } catch (error: any) {
            console.error("Error logging in:", error);
            throw new Error("Failed to log in");
        } finally {
            await session.close();
        }
    }
    


    /**
     * Validates a session by verifying the refresh token and checking if the user exists.
     * @param token - The refresh token to validate.
     * @returns An object containing the username, wallet address, access token, and refresh token.
     */
    public async validateSession(token: string): Promise<userLoginResponse> {
        const tokenService = new TokenService();
        const session = this.driver?.session();
        const walletService = new WalletService(this.driver);

        if (!session) throw new Error("Database session not available");

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
                throw new Error("User not found");
            }
            const user = result.records[0].get("u").properties;
            const walletAddress: string = user.walletAddress;

            const [ walletData] = await Promise.all([
                walletService.getWalletBalance(walletAddress)
            ]);
            
            const { accessToken, refreshToken } = tokens
            return { username: tokens.userName, walletAddress, accessToken, refreshToken, loginType: 'decentragri', walletData};
        } catch (error: any) {
            console.error("Error validating session:", error);
            throw new Error("Invalid session");
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
            throw new Error("Invalid session");
        }
    }





}

export default AuthService;