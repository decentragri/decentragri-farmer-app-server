//** FILE API IMPORTS */
import { writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';


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
import { SEAWEED_MASTER, SEAWEED_VOLUME } from '../utils/constants';

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
     * Uploads a user's profile picture to a SeaweedFS volume server and updates the user's profile in the database.
     *
     * This method performs the following steps:
     * 1. Verifies the provided access token to obtain the username.
     * 2. Parses and validates the provided image buffer data (as a JSON-encoded number array).
     * 3. Uploads the image to a SeaweedFS volume server.
     * 4. Deletes any existing profile picture associated with the user.
     * 5. Creates a new `ProfilePic` node in the database and associates it with the user.
     *
     * @param token - The JWT access token for authenticating the user.
     * @param buffer - An object containing the image data as a JSON-encoded string of a number array.
     * @returns A promise that resolves to a success message upon successful upload and database update.
     * @throws Will throw an error if the token is invalid, the buffer format is incorrect, the upload fails, or the database operation fails.
     */
    public async uploadProfilePic(token: string, buffer: { bufferData: string }): Promise<SuccessMessage> {
      const tokenService = new TokenService();
      const session = this.driver?.session();

      try {
        const username = await tokenService.verifyAccessToken(token);

        // Parse and validate byte array
        let byteArray: number[];
        try {
          byteArray = JSON.parse(buffer.bufferData);
          if (!Array.isArray(byteArray)) throw new Error();
        } catch {
          throw new Error('Invalid buffer format: must be a JSON-encoded number array string');
        }

        if (
          byteArray.length === 0 ||
          byteArray.some((n) => typeof n !== 'number' || n < 0 || n > 255)
        ) {
          throw new Error('Invalid byte values in PackedByteArray');
        }

        const imageBuffer = Buffer.from(byteArray);
        const fileFormat = 'png';
        const uploadedAt = Date.now();

        // 1. Get FID and public URL from Seaweed master
        const assignRes = await fetch(SEAWEED_MASTER + '/dir/assign');
        const assignJson = await assignRes.json();
        const { fid, publicUrl } = assignJson;

        // 2. Upload image to Seaweed volume server
        const form = new FormData();
        form.append('file', new Blob([imageBuffer]), `${username}_${uploadedAt}.${fileFormat}`);

        const uploadRes = await fetch(`http://${publicUrl}/${fid}`, {
          method: 'POST',
          body: form,
        });

        if (!uploadRes.ok) {
          throw new Error(`Seaweed upload failed: ${uploadRes.statusText}`);
        }

        const fileUrl = `http://${publicUrl}/${fid}`;
        await this.deleteOldProfilePicFile(session, username);

        await session?.executeWrite((tx: ManagedTransaction) =>
          tx.run(
            `
            MATCH (u:User {username: $username})
            OPTIONAL MATCH (u)-[r:HAS_PROFILE_PIC]->(old:ProfilePic)
            DELETE r, old
            CREATE (p:ProfilePic {
              id: $id,
              url: $url,
              fileFormat: $fileFormat,
              fileSize: $fileSize,
              uploadedAt: $uploadedAt,
              fid: $fid
            })
            MERGE (u)-[:HAS_PROFILE_PIC]->(p)
            `,
            {
              username,
              id: nanoid(),
              url: fileUrl,
              fileFormat,
              fileSize: imageBuffer.length,
              uploadedAt,
              fid,
            }
          )
        );

        return { success: 'Profile picture uploaded successfully' };
      } catch (err) {
        console.error('Upload error:', err);
        throw err;
      } finally {
        await session?.close();
      }
    }


    /**
     * Deletes the old profile picture file associated with a user, if it exists.
     *
     * This method queries the database for the current profile picture URL of the specified user,
     * resolves the file path, and attempts to delete the file from the filesystem.
     * If the file cannot be deleted, a warning is logged.
     *
     * @param session - The database session used to execute the read transaction.
     * @param username - The username of the user whose old profile picture should be deleted.
     * @returns A promise that resolves when the operation is complete.
     */
    private async deleteOldProfilePicFile(session: any, username: string): Promise<void> {
      try {
        const result = await session.executeRead((tx: ManagedTransaction) =>
          tx.run(
            `
            MATCH (u:User {username: $username})-[:HAS_PROFILE_PIC]->(p:ProfilePic)
            RETURN p.fid AS oldFid
            `,
            { username }
          )
        );

        const oldFid: string | undefined = result?.records?.[0]?.get('oldFid');
        if (oldFid) {
          await fetch(SEAWEED_VOLUME + `/${oldFid}`, {
            method: 'DELETE',
          });
        }
      } catch (err: any) {
        console.warn(`Old profile picture could not be deleted: ${err.message}`);
      }
    }




    /**
     * Retrieves the profile picture for a user by their username.
     *
     * This method queries the Neo4j database for a `ProfilePic` node associated with the given user,
     * fetches the image from SeaweedFS using the file identifier (`fid`), and returns the image data
     * as a JSON-encoded byte array string.
     *
     * @param userName - The username of the user whose profile picture is to be retrieved.
     * @returns A promise that resolves to a `BufferData` object containing the profile picture data as a JSON-encoded byte array string.
     *          If no profile picture is found or fetching fails, `bufferData` will be an empty string.
     * @throws Throws an error if there is an issue querying the database or fetching the image.
     */
    public async getProfilePicture(userName: string): Promise<BufferData> {
      const session = this.driver?.session();
      try {
        const result = await session?.executeRead((tx: ManagedTransaction) =>
          tx.run(
            `
            MATCH (u:User {username: $userName})-[:HAS_PROFILE_PIC]->(p:ProfilePic)
            RETURN p.fid AS fid
            `,
            { userName }
          )
        );

        const record = result?.records?.[0];
        const fid: string | undefined = record?.get('fid');

        if (!fid) {
          return { bufferData: "" }; // No picture found
        }

        const res = await fetch(`${SEAWEED_VOLUME}/${fid}`);
        if (!res.ok) {
          console.warn(`Failed to fetch profile picture from SeaweedFS: ${res.status}`);
          return { bufferData: "" };
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return { bufferData: JSON.stringify([...buffer]) }; // Return as JSON-encoded byte array

      } catch (error: any) {
        console.error("Error retrieving profile picture:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }



}

export default ProfileService;