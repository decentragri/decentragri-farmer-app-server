
//** MEMGRAPH DRIVER
import { Driver, ManagedTransaction } from 'neo4j-driver-core'

//** UUID GENERATOR
import { nanoid } from "nanoid"

//**TYPE IMPORTS */
import type { CreatedFarm, FarmData, FarmList } from './farmer.interface';
import type { SuccessMessage } from '../onchain.services/onchain.interface';

//**SERVICE IMPORT
import TokenService from '../security.services/token.service';

//** CONFIG IMPORT */
import { createFarmCypher } from './farmer.cypher';


class FarmerService {
    driver?: Driver
    constructor(driver?: Driver) {
      this.driver = driver
      };

    public async createFarm(token: string, farmData: FarmData): Promise<SuccessMessage> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
        const username: string = await tokenService.verifyAccessToken(token);
        const farmId: string = nanoid();
        const createdAt: Date = new Date();
        const updatedAt: Date = createdAt;
        const params = {
          username,
          farmId,
          farmName: farmData.farmName,
          cropType: farmData.cropType,
          description: farmData.description ?? null,
          owner: username,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
          lat: farmData.location?.lat,
          lng: farmData.location?.lng,
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

    public async getFarmList(token: string): Promise<FarmList[]> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
      const username: string = await tokenService.verifyAccessToken(token);
      const result = await session?.executeRead((tx: ManagedTransaction) =>
        tx.run(
        `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm)
         RETURN f.farmName AS farmName, f.farmId AS farmId, f.cropType as cropType`,
        { username }
        )
      );

      if (!result || result.records.length === 0) {
        return [];
      }

      return result.records.map(record => ({
        farmName: record.get('farmName'),
        farmId: record.get('farmId'),
        cropType: record.get('cropType')
      }));
      } catch (error) {
      console.error("Error fetching farm list:", error);
      throw error;
      } finally {
      await session?.close();
      }
    }


    public async getFarmData(token: string, farmId: string): Promise<CreatedFarm> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
        const username: string = await tokenService.verifyAccessToken(token);
        const result = await session?.executeRead((tx: ManagedTransaction) =>
          tx.run(
            `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {id: $farmId})
             RETURN f`,
            { username, farmId }
          )
        );

        if (!result || result.records.length === 0) {
          return {} as CreatedFarm; // Return empty object if no farm found
        }

        const farmData = result.records[0].get('f').properties as CreatedFarm;
        return farmData;
      } catch (error) {
        console.error("Error fetching farm data:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }


    public async updateFarm(token: string, farmData: CreatedFarm): Promise<SuccessMessage> {
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
          description: farmData.description ?? null,
          updatedAt: updatedAt.toISOString(),
        };

        await session?.executeWrite((tx: ManagedTransaction) =>
          tx.run(
            `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {id: $farmId})
             SET f.farmName = $farmName, f.crop = $crop, f.description = $description, f.updatedAt = $updatedAt
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


    public async deleteFarm(token: string, farmId: string): Promise<SuccessMessage> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
        const username: string = await tokenService.verifyAccessToken(token);
        await session?.executeWrite((tx: ManagedTransaction) =>
          tx.run(
            `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {id: $farmId})
             DETACH DELETE f`,
            { username, farmId }
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




    




}

export default FarmerService;