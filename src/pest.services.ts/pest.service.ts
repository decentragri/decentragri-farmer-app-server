//** MEMGRAPH DRIVER AND TYPES */
import { Driver, ManagedTransaction, Session } from "neo4j-driver";
import { getDriver } from "../db/memgraph";

//** SERVICES */
import TokenService from "../security.services/token.service";
import WalletService, { engine } from "../wallet.services/wallet.service";

//** UTILS */
import { uploadPicBuffer } from "../utils/utils.thirdweb";

//** CONSTANTS */
import { CHAIN, ENGINE_ADMIN_WALLET_ADDRESS, PLANT_SCAN_EDITION_ADDRESS } from "../utils/constants";
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import type { PestData } from "./pest.interface";


export interface Attribute {
    trait_type: string;
    value: any;
}


class PestService {

    /**
 * Get pest scans for a given user and farm.
 * @param token - JWT token for authentication
 * @param farmName - Name of the farm to fetch pest scans for
 * @returns Array of pest scan records
 */
    public async getPestScans(token: string, farmName: string): Promise<Array<Record<string, any>>> {
        const tokenService = new TokenService();
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();

        if (!session) throw new Error("Unable to create database session.");

        try {
            // Authenticate user
            const username = await tokenService.verifyAccessToken(token);
            console.log(`Fetching pest scans for user: ${username}, farm: ${farmName}`);

            // Query pest scans
            const result = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {name: $farmName})
                    MATCH (f)-[:HAS_PEST_SCAN]->(ps:PestScan)
                    RETURN ps
                    ORDER BY ps.createdAt DESC
                    `,
                    { username, farmName }
                )
            );

            // Parse and return
            const pestScans = result.records.map(record => {
                const node = record.get('ps');
                return {
                    cropType: node.properties.cropType,
                    note: node.properties.note,
                    lat: node.properties.lat,
                    lng: node.properties.lng,
                    interpretation: node.properties.interpretation,
                    createdAt: node.properties.createdAt
                };
            });

            return pestScans;

        } catch (err: any) {
            console.error("Error fetching pest scans:", err.message || err);
            throw new Error("Failed to fetch pest scan data.");
        } finally {
            await session.close();
        }
    }


    /**
     * Save a pest report from farmer to the database
     * @param token - JWT token for authentication
     * @param pestData - PestData object from farmer report
     * @returns SuccessMessage
     */
    public async savePestReport(token: string, pestData: PestData): Promise<SuccessMessage> {
        const tokenService = new TokenService();
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();
        if (!session) throw new Error("Unable to create database session.");
        
        try {
            const username: string = await tokenService.verifyAccessToken(token);
            
            // Upload image to IPFS
            const buffer: Buffer = Buffer.from(pestData.image);
            const imageUri = await uploadPicBuffer(buffer, pestData.pestType);
            
            // Save pest report to database
            await session.executeWrite((tx: ManagedTransaction) =>
                tx.run(
                    `MATCH (u:User {username: $username})
                    CREATE (pr:PestReport {
                        pestType: $pestType,
                        cropAffected: $cropAffected,
                        severityLevel: $severityLevel,
                        location: $location,
                        dateTime: $dateTime,
                        imageUri: $imageUri,
                        reportedBy: $username,
                        createdAt: $createdAt
                    })
                    MERGE (u)-[:REPORTED]->(pr)
                    `,
                    {
                        username,
                        pestType: pestData.pestType,
                        cropAffected: pestData.cropAffected,
                        severityLevel: pestData.severityLevel,
                        location: pestData.location,
                        dateTime: pestData.dateTime,
                        imageUri: imageUri,
                        createdAt: new Date().toISOString()
                    }
                )
            );
            
            await session.close();
            
            // Mint NFT
            await this.savePestReportToNFT(pestData, imageUri, username);
            
            return { success: "Pest report saved and NFT minted successfully." };
            
        } catch (error: any) {
            console.error("Error saving pest report:", error.message || error);
            throw new Error("Failed to save pest report.");
        }
    }

    /**
     * Get pest reports for a given user
     * @param token - JWT token for authentication
     * @returns Array of pest report records
     */
    public async getPestReports(token: string): Promise<Array<Record<string, any>>> {
        const tokenService = new TokenService();
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();

        if (!session) throw new Error("Unable to create database session.");

        try {
            // Authenticate user
            const username = await tokenService.verifyAccessToken(token);
            console.log(`Fetching pest reports for user: ${username}`);

            // Query pest reports
            const result = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})-[:REPORTED]->(pr:PestReport)
                    RETURN pr
                    ORDER BY pr.createdAt DESC
                    `,
                    { username }
                )
            );

            // Parse and return
            const pestReports = result.records.map(record => {
                const node = record.get('pr');
                return {
                    pestType: node.properties.pestType,
                    cropAffected: node.properties.cropAffected,
                    severityLevel: node.properties.severityLevel,
                    location: node.properties.location,
                    dateTime: node.properties.dateTime,
                    imageUri: node.properties.imageUri,
                    reportedBy: node.properties.reportedBy,
                    createdAt: node.properties.createdAt
                };
            });

            return pestReports;

        } catch (err: any) {
            console.error("Error fetching pest reports:", err.message || err);
            throw new Error("Failed to fetch pest report data.");
        } finally {
            await session.close();
        }
    }

    /**
     * Mint a pest report as an ERC-1155 NFT with image.
     * @param data - PestData object
     * @param imageUri - IPFS URI of the uploaded image
     * @param username - The user who owns the report
     */
    private async savePestReportToNFT(data: PestData, imageUri: string, username: string): Promise<void> {
        const driver: Driver = getDriver();
        const walletService = new WalletService(driver);
        const smartWalletAddress: string = await walletService.getSmartWalletAddress(username);
        
        try {
            const attributes: Attribute[] = [
                { trait_type: "Pest Type", value: data.pestType },
                { trait_type: "Crop Affected", value: data.cropAffected },
                { trait_type: "Severity Level", value: data.severityLevel.toString() },
                { trait_type: "Location", value: data.location }
            ];
            
            const metadata = {
                receiver: smartWalletAddress,
                metadataWithSupply: {
                    metadata: {
                        name: "Pest Report NFT",
                        description: "Farmer-reported pest incident with photographic evidence.",
                        image: imageUri,
                        external_url: "https://decentragri.com/pest-reports",
                        properties: {
                            username,
                            pestType: data.pestType,
                            cropAffected: data.cropAffected,
                            severityLevel: data.severityLevel,
                            location: data.location,
                            dateTime: data.dateTime,
                            imageUri: imageUri,
                            timestamp: new Date().toISOString()
                        },
                        attributes,
                        background_color: "#FFE0E0"
                    },
                    supply: "1"
                }
            };
            
            await engine.erc1155.mintTo(CHAIN, PLANT_SCAN_EDITION_ADDRESS, ENGINE_ADMIN_WALLET_ADDRESS, metadata);
            console.log("Pest report NFT minted successfully");
        } catch (error) {
            console.error("Error minting pest report NFT:", error);
            throw new Error("Failed to mint pest report NFT");
        }
    }

}


export default PestService;