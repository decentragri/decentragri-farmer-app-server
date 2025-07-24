
//** MEMGRAPH DRIVER
import { Driver, ManagedTransaction, Session } from 'neo4j-driver-core'

//** UUID GENERATOR
import { v4 as nanoid } from 'uuid';

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
const NodeGeocoder = require('node-geocoder');
import { serverWallet, transactionContract, uploadPicBuffer } from '../utils/utils.thirdweb';
import { DECENTRAGRI_TOKEN, PLANT_SCAN_EDITION_ADDRESS } from '../utils/constants';
import { getNFT, getNFTs, getOwnedNFTs, mintTo } from 'thirdweb/extensions/erc1155';
import { createListing } from 'thirdweb/extensions/marketplace';

// Initialize geocoder
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  formatter: null // disable formatter to get raw data
});

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

        const byteImage: number[] = JSON.parse(farmData.imageBytes);
        const buffer: Buffer = Buffer.from(byteImage);

        // Get location details from coordinates
        const geocodeResult = await geocoder.reverse({
          lat: farmData.coordinates.lat,
          lon: farmData.coordinates.lng
        });

        // Extract location details
        const locationInfo = geocodeResult[0] || {};
        const city = locationInfo.city || '';
        const province = locationInfo.state || "";
        const location = city && province ? `${city}, ${province}` : 'Unknown Location';

        const params: CreatedFarm & { username: string } = {
          username,
          id,
          farmName: farmData.farmName,
          cropType: farmData.cropType,
          note: farmData.note,
          owner: username,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
          coordinates: farmData.coordinates,
          location: location,
          image: await uploadPicBuffer(buffer, farmData.farmName)
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
          owner: record.get('owner'),
          farmName: record.get('farmName'),
          id: record.get('id'),
          cropType: record.get('cropType'),
          description: record.get('description'),
          image: record.get('image'),
          coordinates: record.get('coordinates'),
          updatedAt: updatedAt,
          createdAt: createdAt,
          formattedUpdatedAt: formattedUpdatedAt,
          formattedCreatedAt: formattedCreatedAt,
          location: record.get('location')
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
          imageBytes: farmData.imageBytes ?? null,
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



    /**
     * Sells a farm owned by the authenticated user.
     * @param token - Auth token
     * @param id - Farm ID
     * @returns Success message
     */
    public async sellFarm(token: string, id: string): Promise<SuccessMessage> {
      const tokenService = new TokenService();
      const session = this.driver?.session();
    
      try {
        const username: string = await tokenService.verifyAccessToken(token);
    
        const result = await session?.executeWrite(async (tx: ManagedTransaction) =>
          tx.run(
            `
            MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {id: $id})
            OPTIONAL MATCH (f)<-[:REQUESTS_TO_SELL]-(existing:SellRequest {status: "pending"})
            WITH u, f, existing
            WHERE existing IS NULL
            CREATE (sr:SellRequest {
              id: randomUUID(),
              status: "pending",
              requestedAt: datetime()
            })
            MERGE (sr)-[:REQUESTS_TO_SELL]->(f)
            RETURN sr
            `,
            { username, id }
          )
        );
    
        if (!result || result.records.length === 0) {
          return { success: "Farm not found or already has pending request" };
        }
    
        return { success: "Farm Sale Application Submitted Successfully" };
      } catch (error) {
        console.error("Error submitting sell request:", error);
        throw error;
      } finally {
        await session?.close();
      }
    }
    





    // private async mintFarmNFT(walletAddress: string, farmData: CreatedFarm): Promise<void> {
    //   try {
    //     // Import the client and chain from your utils
    //     // Get the contract with proper configuration
    //     const contract = transactionContract(PLANT_SCAN_EDITION_ADDRESS);

    //     const metadata = {
    //       name: "Farm NFT",
    //       description: "Farm NFT",
    //       image: farmData.image,
    //       external_url: "https://decentragri.com",
    //       background_color: "#E0FFE0",
    //       properties: {
    //         uniqueId: nanoid(),
    //         image: "Uploaded via buffer", // fallback text
    //         cropType: farmData.cropType,
    //         description: farmData.note,
    //         lat: farmData.lat,
    //         lng: farmData.lng,
    //         note: farmData.note,
    //       },
    //       attributes: [
    //         {
    //           trait_type: "Crop Type",
    //           value: farmData.cropType,
    //         },
    //         {
    //           trait_type: "Latitude",
    //           value: farmData.lat,
    //         },
    //         {
    //           trait_type: "Longitude",
    //           value: farmData.lng,
    //         },
    //         {
    //           trait_type: "Note",
    //           value: farmData.note,
    //         },
    //       ],
    //     };


    //     const transaction = mintTo({ contract, to: walletAddress, supply: 1n, nft: metadata });
    //     (await serverWallet(walletAddress)).enqueueTransaction({ transaction })
          
     

        
    //   } catch (error) {
        
    //   }
    // }



    // private async listFarmForSale(walletAddress: string, id: string): Promise<void> {
    //   try {


        




    //     // const contract = transactionContract(PLANT_SCAN_EDITION_ADDRESS);
    //     // const transaction = createListing({
    //     //   assetContractAddress: PLANT_SCAN_EDITION_ADDRESS, 
    //     //   tokenId: BigInt(id), quantity: 1n, 
    //     //   currencyContractAddress: DECENTRAGRI_TOKEN,
    //     //   pricePerToken: "10000", 
    //     //   contract})


        


 




        
    //   } catch (error) {
        
    //   }
    // }




}

export default FarmService;