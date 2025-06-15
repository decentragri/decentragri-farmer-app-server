
//** MEMGRAPH DRIVER
import { Driver, ManagedTransaction, Session, type QueryResult } from 'neo4j-driver-core'

//** UUID GENERATOR
import { nanoid } from "nanoid"

//**TYPE IMPORTS */
import type { SuccessMessage } from '../onchain.services/onchain.interface';

//**SERVICE IMPORT
import TokenService from '../security.services/token.service';
import type { BufferData, UserLoginResponse } from '../auth.services/auth.interface';
import type { LevelUpResult, UserProfileResponse } from './profile.interface';
import { profilePictureCypher } from './profile.cypher';

//** CONFIG IMPORT */


class ProfileService {
    driver?: Driver
    constructor(driver?: Driver) {
      this.driver = driver
    };

    // Define a new interface for the profile response, extending UserLoginResponse


    /**
     * Retrieves the profile of a user based on the provided access token.
     * @param token - The access token of the user.
     * @returns A promise that resolves to the user's profile information.
     */
    public async getProfile(token: string): Promise<UserProfileResponse> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
        const username: string = await tokenService.verifyAccessToken(token);

        // Get user properties and counts in parallel
        const [userResult, counts] = await Promise.all([
          session?.executeRead((tx: ManagedTransaction) =>
            tx.run(
              `MATCH (u:User {username: $username}) RETURN u as user`,
              { username }
            )
          ),
          this.getUserCounts(session, username)
        ]);

        if (!userResult || userResult.records.length === 0) {
          throw new Error("User not found");
        }

        const userProfile: UserProfileResponse = {
          ...userResult.records[0].get('user').properties,
          ...counts
        };
        return userProfile;

      } catch (error) {
        console.error("Error getting profile:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }

    /**
     * Retrieves various counts related to the user (farms, plant scans, sensors, readings).
     * @param session - The Neo4j session.
     * @param username - The username to query.
     * @returns An object with farmCount, plantScanCount, sensorCount, and readingCount.
     */
    private async getUserCounts(session: Session | undefined, username: string) {
      // Helper to extract and convert count values
      const getCount = (result: QueryResult | undefined, key: string) => {
        const value = result?.records[0].get(key);
        return typeof value?.toInt === 'function' ? value.toInt() : value;
      };

      const [
        farmCountResult,
        plantScanCountResult,
        readingCountResult
      ] = await Promise.all([
        session?.executeRead((tx: ManagedTransaction) =>
          tx.run(
            `MATCH (u:User {username: $username})-[:OWNS|:MANAGES|:HAS_FARM]->(f:Farm) RETURN count(f) as farmCount`,
            { username }
          )
        ),
        session?.executeRead((tx: ManagedTransaction) =>
          tx.run(
            `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm)
             OPTIONAL MATCH (f)-[:HAS_PLANT_SCAN]->(ps:PlantScan)
             RETURN count(ps) as plantScanCount`,
            { username }
          )
        ),

        session?.executeRead((tx: ManagedTransaction) =>
          tx.run(
            `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm)
             OPTIONAL MATCH (f)-[:HAS_SENSOR]->(s:Sensor)-[:HAS_READING]->(r:Reading)
             RETURN count(r) as readingCount`,
            { username }
          )
        )
      ]);

      return {
        farmCount: getCount(farmCountResult, 'farmCount'),
        plantScanCount: getCount(plantScanCountResult, 'plantScanCount'),
        readingCount: getCount(readingCountResult, 'readingCount')
        };
    }

    // Calculates the experience gain for a user based on their current level and accuracy
    /**
     * Calculates the amount of experience a user gains based on their current level and accuracy,
     * updates the user's experience, and returns the result of the level-up calculation.
     *
     * @param username - The username of the user whose experience is being calculated. Defaults to "nashar4".
     * @param accuracy - The accuracy value (as a decimal between 0 and 1) used to adjust the experience gain.
     * @returns A promise that resolves to a {@link LevelUpResult} containing the updated user experience and level information.
     * @throws Will throw an error if user details cannot be retrieved or experience cannot be calculated.
     */
    public async calculateExperienceGain(username: string = "nashar4", accuracy: number): Promise<LevelUpResult> {
        try {
            // Retrieve user details
            const user: UserLoginResponse = await this.getUserDetails(username);
            const { level } = user;
    
            // Calculate experience gain
            const experienceRequired: number = await this.getRequiredUserExperience(level);
            const baseExperienceGain: number = Math.floor(10 * Math.pow(level, 1.8));
            let adjustedExperienceGain: number = baseExperienceGain * (accuracy * 100);
            const minExperienceGain: number = Math.floor(experienceRequired * 0.05);
            const maxExperienceGain: number = Math.floor(experienceRequired * 0.2);
            adjustedExperienceGain = Math.max(minExperienceGain, Math.min(maxExperienceGain, adjustedExperienceGain));
    
            const experienceGained: number = Math.floor(adjustedExperienceGain);
    
            // Generate the experience and return the result
            const result: LevelUpResult = await this.generateExperience(experienceGained, user);
            await this.saveUserDetails(username, result);
            return result;
    
        } catch (error: any) {
            console.error("Error calculating experience gain:", error);
            throw error;
        }
    }
    
    // Calculates the required experience for a given level using a unified formula
    private async getRequiredUserExperience(level: number): Promise<number> {
        // Unified formula for required experience
        return Math.round(Math.pow(level, 1.8) + level * 4);
    }
    

    // Generates experience for a user, updating their level and experience points accordingly
    /**
     * Calculates the user's new level and remaining experience after gaining experience points.
     * 
     * This method adds the gained experience to the user's current experience and determines
     * if the user levels up one or more times based on the required experience for each level.
     * It continues to process level-ups until the user no longer has enough experience to reach
     * the next level. The method returns the updated level, remaining experience, and the total
     * experience gained.
     * 
     * @param experienceGained - The amount of experience points the user has gained.
     * @param stats - The user's current stats, including level and experience.
     * @returns A promise that resolves to a `LevelUpResult` containing the updated level, remaining experience, and experience gained.
     * @throws Throws an error if experience calculation fails.
     */
    private async generateExperience(experienceGained: number, stats: UserLoginResponse): Promise<LevelUpResult> {
        try {
            const { level, experience } = stats;
            let currentLevel: number = level;
            let currentExperience: number = experience + experienceGained;
    
            // Loop until all experience is consumed or no level-up can occur
            while (true) {
                // Use the unified formula for required experience
                const requiredExperience: number = await this.getRequiredUserExperience(currentLevel);
    
                // Check if the user can level up
                if (currentExperience < requiredExperience) break;
    
                // Subtract required experience for the current level and increment level
                currentExperience -= requiredExperience;
                currentLevel++;
    
                console.log(`Current Level: ${currentLevel}, Required Experience: ${requiredExperience}, Current Experience: ${currentExperience}`);
            }
    
            // Return the updated level and experience
            return { currentLevel, currentExperience, experienceGained };
        } catch (error: any) {
            console.error("Error generating experience:", error);
            throw error;
        }
    }
    
    
    //Retrieves details of a user  based on the provided username.
    /**
     * Retrieves the details of a user by their username from the database.
     *
     * @param username - The username of the user whose details are to be fetched.
     * @returns A promise that resolves to a `UserLoginResponse` object containing the user's details.
     * @throws Will throw an error if the user with the specified username is not found or if a database error occurs.
     */
    private async getUserDetails(username: string): Promise<UserLoginResponse> {
        const session: Session | undefined = this.driver?.session();
        try {
            // Find the user node within a Read Transaction
            const result: QueryResult | undefined = await session?.executeRead((tx: ManagedTransaction) =>
                tx.run('MATCH (u:User {username: $username}) RETURN u', { username })
            );

            if (!result || result.records.length === 0) {
                throw new Error(`User with username '${username}' not found.`);
            }

            return result.records[0].get('u');
        } catch(error: any) {
          console.log(error)
          throw error

        }
    }


    //Saves the details of a user, including player statistics, in the database.
    /**
     * Saves or updates the user's level and experience details in the database.
     *
     * @param username - The unique username of the user whose details are being saved.
     * @param playerStats - An object containing the user's current experience and level.
     * @returns A promise that resolves when the user's details have been successfully saved.
     * @throws Will throw an error if the database session cannot be created or if the write operation fails.
     */
    private async saveUserDetails(username: string, playerStats: LevelUpResult): Promise<void> {
        const session: Session | undefined = this.driver?.session();
        const { currentExperience, currentLevel } = playerStats;
    
        try {
            if (!session) {
                throw new Error("Database session could not be created.");
            }
    
            // Execute a write transaction to update the user's playerStats as a whole object
            await session.executeWrite((tx: ManagedTransaction) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username}) 
                    SET u.level = $currentlevel,
                        u.experience = $experience 
                    RETURN u
                    `,
                    { username, currentLevel, experience: currentExperience }
                )
            );
        } catch (error: any) {
            console.error("Error saving user details:", error);
            throw error;
        } finally {
            await session?.close();
        }
    }



    /**
     * Uploads a new profile picture for the user associated with the provided token.
     * 
     * This method first verifies the user's access token, removes any existing profile picture,
     * and then creates a new `ProfilePic` node in the database, associating it with the user.
     * The image is stored as a buffer along with metadata such as upload time, file format, and size.
     * 
     * @param token - The JWT access token identifying the user.
     * @param imageBuffer - The buffer data containing the image to be uploaded.
     * @returns A promise that resolves to a success message upon successful upload.
     * @throws Will throw an error if the token is invalid, the database operation fails, or any other error occurs during the process.
     */
    public async uploadProfilePic(token: string, imageBuffer: BufferData,): Promise<SuccessMessage> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
        const userName: string = await tokenService.verifyAccessToken(token);

        const uploadedAt: number = Date.now();
        const fileFormat: string = "png";
        const fileSize: number = 100;

        // Remove existing profile picture if it exists
        await session?.executeWrite((tx: ManagedTransaction) =>
          tx.run(
            `
            MATCH (u:User {username: $userName})-[:HAS_PROFILE_PIC]->(p:ProfilePic)
            DETACH DELETE p
            `,
            { userName }
          )
        );

        // Create a new ProfilePic node and connect to the user
        await session?.executeWrite((tx: ManagedTransaction) =>
          tx.run(
            profilePictureCypher,
            { userName, id: nanoid(), image: imageBuffer.bufferData, uploadedAt, fileFormat, fileSize }
          )
        );

        return { success: "Profile picture upload successful" };
      } catch (error: any) {
        console.error("Error updating profile picture:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }



    /**
     * Retrieves the profile picture for a user by their username.
     *
     * This method queries the database for a `User` node with the specified username,
     * follows the `HAS_PROFILE_PIC` relationship to the associated `ProfilePic` node,
     * and returns the image data as a buffer.
     *
     * @param userName - The username of the user whose profile picture is to be retrieved.
     * @returns A promise that resolves to a `BufferData` object containing the image buffer data,
     *          or an empty string if no profile picture is found.
     * @throws Will throw an error if the database query fails.
     */
    public async getProfilePicture(userName: string): Promise<BufferData> {
      const session = this.driver?.session();
      try {
        const result = await session?.executeRead((tx: ManagedTransaction) =>
          tx.run(
            `
            MATCH (u:User {username: $userName})-[:HAS_PROFILE_PIC]->(p:ProfilePic)
            RETURN p.image AS image
            `,
            { userName }
          )
        );

        if (result && result.records.length > 0) {
          return { bufferData: result.records[0].get('image') };
        } else {
          return { bufferData: "" }; // No profile picture found
        }
      } catch (error: any) {
        console.error("Error retrieving profile picture:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }



}

export default ProfileService;