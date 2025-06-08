//** MEMGRAPH DRIVER AND TYPES */
import { Driver, ManagedTransaction, Session } from "neo4j-driver";
import { getDriver } from "../db/memgraph";



//** SERVICES */
import TokenService from "../security.services/token.service";
import WalletService, { engine } from "../wallet.services/wallet.service";

//** CONSTANTS */
import { CHAIN, ENGINE_ADMIN_WALLET_ADDRESS, PLANT_SCAN_EDITION_ADDRESS } from "../utils/constants";
import { uploadPicBuffer } from "../utils/utils.thirdweb";
import type { PlantScanResult, ParsedInterpretation } from "./data.interface";
import type { PestScanResult } from "../ai.services/pest.ai.team.service/pest.interface";


class PestData {

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
     * Mint a pest scan as an ERC-1155 NFT (no image).
     * @param data - Pest scan metadata (crop type, note, interpretation, etc.)
     * @param username - The user who owns the farm and scan
     */
    public async savePestScanToNFT( data: PestScanResult, username: string ): Promise<void> {
        const driver: Driver = getDriver();
        const walletService = new WalletService(driver);
        const smartWalletAddress: string = await walletService.getSmartWalletAddress(username);

        try {
            const attributes = [
                {
                    trait_type: "Pest Risk",
                    value: data.interpretation
                },
                {
                    trait_type: "Crop Type",
                    value: data.cropType
                },
                {
                    trait_type: "Location",
                    value: `(${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)})`
                }
            ];

            const metadata = {
                receiver: smartWalletAddress,
                metadataWithSupply: {
                    metadata: {
                        name: "Pest Risk NFT",
                        description: "AI-generated pest risk analysis based on crop data.",
						image: "https://d391b93f5f62d9c15f67142e43841acc.ipfscdn.io/ipfs/QmdRtWRHQwEkKA7nciqRQmgW7y6yygT589aogfUYaoc3Ea/ChatGPT%20Image%20Apr%2021%2C%202025%2C%2012_14_42%20PM.png",
						external_url: "https://decentragri.com/plant-scans",
                        properties: {
                            username,
                            cropType: data.cropType,
                            lat: data.location.lat,
                            lng: data.location.lng,
                            interpretation: data.interpretation,
                            timestamp: new Date().toISOString()
                        },
                        attributes,
                        background_color: "#FFF6E0"
                    },
                    supply: "1"
                }
            };

            await engine.erc1155.mintTo(CHAIN, PLANT_SCAN_EDITION_ADDRESS, ENGINE_ADMIN_WALLET_ADDRESS, metadata);
            console.log("Pest scan NFT minted successfully");
        } catch (error) {
            console.error("Error minting pest scan NFT:", error);
            throw new Error("Failed to mint pest scan NFT");
        }
    }



}


export default PestData;