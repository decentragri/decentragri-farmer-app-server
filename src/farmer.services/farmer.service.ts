
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
        const id: string = nanoid();
        const createdAt: Date = new Date();
        const updatedAt: Date = createdAt;
        const params = {
          username,
          id,
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


    public async getFarmList(token: string): Promise<Array<FarmList & { formattedUpdatedAt: string; formattedCreatedAt: string }>> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
      try {
      const username: string = await tokenService.verifyAccessToken(token);
      const result = await session?.executeRead((tx: ManagedTransaction) =>
        tx.run(
        `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm)
         RETURN f.farmName AS farmName, f.id AS id, f.cropType as cropType, f.updatedAt as updatedAt, f.createdAt as createdAt`,
        { username }
        )
      );

      if (!result || result.records.length === 0) {
        return [];
      }

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


    public async getFarmData(token: string, id: string): Promise<CreatedFarm> {
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
            `MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {id: $id})
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

}

export default FarmerService;