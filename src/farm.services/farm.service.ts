
//** MEMGRAPH DRIVER
import { Driver, ManagedTransaction, Session } from 'neo4j-driver-core'

//** UUID GENERATOR
import { nanoid } from "nanoid"

//**TYPE IMPORTS */
import type { CreatedFarm, FarmData, FarmList, FarmUpdateData } from './farm.interface';
import type { SuccessMessage } from '../onchain.services/onchain.interface';
import type { FarmScanResult } from '../plant.services/plantscan.interface';

//**SERVICE IMPORT
import TokenService from '../security.services/token.service';

//** CONFIG IMPORT */
import { getDriver } from '../db/memgraph';

//**CYPHERS IMPORT */
import { createFarmCypher, getFarmListCypher, getRecentFarmScansCypher } from './farm.cypher';


class FarmService {
    driver?: Driver
    constructor(driver?: Driver) {
      this.driver = driver
      };
    
    /**
     * Creates a new farm for the authenticated user.
     * @param token - Auth token
     * @param farmData - Farm data to create
     * @returns Success message
     */
    public async createFarm(token: string, farmData: FarmData): Promise<SuccessMessage> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
        const username: string = await tokenService.verifyAccessToken(token);
        const id: string = nanoid();
        const createdAt: Date = new Date();
        const updatedAt: Date = createdAt;
        const params = {
          username,
          id,
          farmName: farmData.farmName,
          cropType: farmData.cropType,
          note: farmData.note,
          owner: username,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
          image: farmData.image
        };

        

        await session?.executeWrite((tx: ManagedTransaction) =>
          tx.run(createFarmCypher, params)
        );

        return { success: "Farm created successfully" };
      } catch (error) {
        console.error("Error creating farm:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }

    /**
     * Retrieves a list of farms owned by the authenticated user.
     * @param token - Auth token
     * @returns Array of farm data
     */
    public async getFarmList(token: string): Promise<Array<FarmList & { formattedUpdatedAt: string; formattedCreatedAt: string }>> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
      const username: string = await tokenService.verifyAccessToken(token);
      const result = await session?.executeRead((tx: ManagedTransaction) =>
        tx.run(getFarmListCypher, { username })
      );

      if (!result || result.records.length === 0) {
        
        return [];
      }
      console.log(result.records)

      return result.records.map(record => {
        // Format updatedAt
        const rawUpdatedAt = record.get('updatedAt');
        const updatedAt = rawUpdatedAt instanceof Date ? rawUpdatedAt : new Date(rawUpdatedAt);
        const formattedUpdatedAt = updatedAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Format createdAt
        const rawCreatedAt = record.get('createdAt');
        const createdAt = rawCreatedAt instanceof Date ? rawCreatedAt : new Date(rawCreatedAt);
        const formattedCreatedAt = createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        return {
          farmName: record.get('farmName'),
          id: record.get('id'),
          cropType: record.get('cropType'),
          updatedAt: updatedAt,
          createdAt: createdAt,
          formattedUpdatedAt: formattedUpdatedAt,
          formattedCreatedAt: formattedCreatedAt
        } as FarmList & { formattedUpdatedAt: string; formattedCreatedAt: string };
      });
      } catch (error) {
      console.error("Error fetching farm list:", error);
      throw error;
      } finally {
      await session?.close();
      }
    }

    /**
     * Retrieves data for a specific farm owned by the authenticated user.
     * @param token - Auth token
     * @param id - Farm ID
     * @returns Farm data
     */
    public async getFarmData(token: string, id: string): Promise<CreatedFarm & { formattedUpdatedAt: string; formattedCreatedAt: string }> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
        const username: string = await tokenService.verifyAccessToken(token);
        const result = await session?.executeRead((tx: ManagedTransaction) =>
          tx.run(
            `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {id: $id})
             RETURN f`,
            { username, id }
          )
        );

        if (!result || result.records.length === 0) {
          return {} as CreatedFarm & { formattedUpdatedAt: string; formattedCreatedAt: string }; // Return empty object if no farm found
        }

        const farmData = result.records[0].get('f').properties as CreatedFarm;
        
        // Format updatedAt
        const rawUpdatedAt = farmData.updatedAt;
        const updatedAt = rawUpdatedAt ? (rawUpdatedAt instanceof Date ? rawUpdatedAt : new Date(rawUpdatedAt)) : new Date();
        const formattedUpdatedAt = updatedAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Format createdAt
        const rawCreatedAt = farmData.createdAt;
        const createdAt = rawCreatedAt ? (rawCreatedAt instanceof Date ? rawCreatedAt : new Date(rawCreatedAt)) : new Date();
        const formattedCreatedAt = createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        return {
          ...farmData,
          formattedUpdatedAt,
          formattedCreatedAt
        };
      } catch (error) {
        console.error("Error fetching farm data:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }

    /**
     * Updates a farm owned by the authenticated user.
     * @param token - Auth token
     * @param farmData - Farm data to update
     * @returns Success message
     */
    public async updateFarm(token: string, farmData: FarmUpdateData): Promise<SuccessMessage> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
        const username: string = await tokenService.verifyAccessToken(token);
        const updatedAt: Date = new Date();
        const params = {
          username,
          id: farmData.id,
          farmName: farmData.farmName,
          cropType: farmData.cropType,
          note: farmData.note ?? null,
          image: farmData.image ?? null,
          updatedAt: updatedAt.toISOString(),
        };

        await session?.executeWrite((tx: ManagedTransaction) =>
          tx.run(
            `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {id: $id})
             SET f.farmName = $farmName, f.cropType = $cropType, f.note = $note, f.image = $image, f.updatedAt = $updatedAt
             RETURN f`,
            params
          )
        );

        return { success: "Farm updated successfully" };
      } catch (error) {
        console.error("Error updating farm:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }

    /**
     * Deletes a farm owned by the authenticated user.
     * @param token - Auth token
     * @param id - Farm ID
     * @returns Success message
     */
    public async deleteFarm(token: string, id: string): Promise<SuccessMessage> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
        const username: string = await tokenService.verifyAccessToken(token);
        await session?.executeWrite((tx: ManagedTransaction) =>
          tx.run(
            `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {id: $id})
             DETACH DELETE f`,
            { username, id }
          )
        );

        return { success: "Farm deleted successfully" };
      } catch (error) {
        console.error("Error deleting farm:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }


    /**
    * Retrieves recent farm scan results for a specific user and farm within the last 7 days.
    *
    * @param username - The username associated with the farm scans.
    * @param farmName - The name of the farm to retrieve scans for.
    * @returns A promise that resolves to a `FarmScanResult` object containing arrays of soil readings and plant scans.
    *
    * @throws Will throw an error if the database query fails.
    */
    public async getRecentFarmScans(username: string, farmName: string): Promise<FarmScanResult> {
        const driver: Driver = getDriver();
        const session: Session | undefined = driver.session();

        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            const result = await session.executeRead((tx) =>
              tx.run(getRecentFarmScansCypher, {
                  username,
                  farmName,
                  cutoff: sevenDaysAgo
              })
            );

            const record = result.records[0];

            return {
              soilReadings: record.get("soilReadings").map((r: any) => r.properties),
              plantScans: record.get("plantScans").map((p: any) => p.properties),
            };
        } catch (error) {
            throw new Error(`Failed to retrieve recent farm scans: ${error}`);
        } finally {
            await session.close();
        }
    }

}

export default FarmService;