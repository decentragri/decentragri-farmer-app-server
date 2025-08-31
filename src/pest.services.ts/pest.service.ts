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
import type { PestScanResult } from "../ai.services/pest.ai.team.service/pest.interface";
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import type { PestData, PestReportResponse } from "./pest.interface";


export interface Attribute {
    trait_type: string;
    value: any;
}


class PestService {


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
            let byteImage: number[];
            try {
                byteImage = JSON.parse(pestData.imageBytes);
                if (!Array.isArray(byteImage)) {
                    throw new Error("Parsed imageBytes is not an array");
                }
            } catch (parseError) {
                console.error("Error parsing imageBytes:", parseError);
                throw new Error("Invalid imageBytes format. Expected stringified number array.");
            }
            
            const buffer: Buffer = Buffer.from(byteImage);
            const imageUri = await uploadPicBuffer(buffer, pestData.pestType);
            
            // Save pest report to database
            await session.executeWrite((tx: ManagedTransaction) =>
                tx.run(
                    `MATCH (u:User {username: $username})
                    CREATE (pr:PestReport {
                        pestType: $pestType,
                        cropAffected: $cropAffected,
                        severityLevel: $severityLevel,
                        lat: $lat,
                        lng: $lng,
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
                        lat: pestData.coordinates.lat,
                        lng: pestData.coordinates.lng,
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
    public async getPestReport(token: string): Promise<PestReportResponse[]> {
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
            const pestReports: PestReportResponse[] = result.records.map(record => {
                const node = record.get('pr');
                return {
                    pestType: node.properties.pestType,
                    cropAffected: node.properties.cropAffected,
                    severityLevel: node.properties.severityLevel,
                    lat: node.properties.lat,
                    lng: node.properties.lng,
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
            const attributes = [
                { trait_type: "Pest Type", value: data.pestType },
                { trait_type: "Crop Affected", value: data.cropAffected },
                { trait_type: "Severity Level", value: data.severityLevel.toString() },
                { trait_type: "Location", value: `(${data.coordinates.lat.toFixed(4)}, ${data.coordinates.lng.toFixed(4)})` }
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
                            lat: data.coordinates.lat,
                            lng: data.coordinates.lng,
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