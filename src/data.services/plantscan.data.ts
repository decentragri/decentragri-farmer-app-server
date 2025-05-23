//** MEMGRAPH DRIVER AND TYPES */
import { Driver, ManagedTransaction, Session, type QueryResult } from "neo4j-driver";
import { getDriver } from "../db/memgraph";

//** TYPES */
import type { PlantImageSessionParams } from "../ai.services/plant.ai.team.service/plant.ai.team";
//** SERVICES */
import TokenService from "../security.services/token.service";
import WalletService, { engine } from "../wallet.services/wallet.service";

//** CONSTANTS */
import { CHAIN, ENGINE_ADMIN_WALLET_ADDRESS, PLANT_SCAN_EDITION_ADDRESS } from "../utils/constants";
import { uploadPicBuffer, uploadPicIPFS } from "../utils/utils.thirdweb";

class PlantData {
	/**
	 * Save plant image analysis data into Memgraph and mint an NFT.
	 */
	public async savePlantScan(data: PlantImageSessionParams & { interpretation: string }, username: string): Promise<void> {
		const driver: Driver = getDriver();
		const session: Session | undefined = driver?.session();

		if (!session) throw new Error("Unable to create database session.");

		try {
			await Promise.all([
				session.executeWrite((tx: ManagedTransaction) =>
					tx.run(
						`
						MERGE (u:User {username: $username})
						MERGE (p:PlantScan {
							cropType: $cropType,
							date: $date,
							note: $note,
							lat: $lat,
							lng: $lng,
							interpretation: $interpretation
						})
						MERGE (u)-[:HAS_PLANT_SCAN]->(p)
					`,
					{
						username: username,
						cropType: data.cropType ?? null,
						date: new Date().toISOString(),
						note: data.note ?? null,
						lat: data.location?.lat ?? null,
						lng: data.location?.lng ?? null,
						interpretation: data.interpretation
					}
				)
			),
			this.savePlantScanToNFT(data, data.imageBytes, username)
			]);
		} catch (err) {
			console.error("Error saving plant scan:", err);
			throw new Error("Failed to save plant scan");
		} finally {
			await session.close();
		}
	}

	/**
	 * Retrieve all plant scans for the given user.
	 */
	public async getPlantScans(token: string): Promise<any[]> {
		const driver: Driver = getDriver();
		const session: Session | undefined = driver?.session();
		const tokenService: TokenService = new TokenService();

		if (!session) throw new Error("Unable to create database session.");

		try {
			const username: string = await tokenService.verifyAccessToken(token);

			const query = `
				MATCH (u:User {username: $username})-[:HAS_PLANT_SCAN]->(p:PlantScan)
				RETURN p ORDER BY p.date DESC
			`;

			const result: QueryResult = await session.executeRead((tx: ManagedTransaction) =>
				tx.run(query, { username })
			);

			return result.records.map((record) => record.get("p").properties);
		} catch (error) {
			console.error("Error fetching plant scans:", error);
			throw new Error("Failed to fetch plant scans");
		} finally {
			await session.close();
		}
	}

	/**
	 * Mint NFT representing the plant image analysis.
	 */
	private async savePlantScanToNFT(data: PlantImageSessionParams & { interpretation: string }, image: string, username: string): Promise<void> {
		const driver: Driver = getDriver();
		const walletService = new WalletService(driver);
		const smartWalletAddress: string = await walletService.getSmartWalletAddress(username);

        const byteImage: number[] = JSON.parse(image);
        const buffer: Buffer = Buffer.from(byteImage);
        const imageUri = await uploadPicBuffer(buffer, data.cropType)

		try {
			const metadata = {
				receiver: smartWalletAddress,
				metadataWithSupply: {
					metadata: {
						name: "Plant Health NFT",
						description: "Visual health check of crop using AI analysis.",
						image: "https://d391b93f5f62d9c15f67142e43841acc.ipfscdn.io/ipfs/QmdRtWRHQwEkKA7nciqRQmgW7y6yygT589aogfUYaoc3Ea/ChatGPT%20Image%20Apr%2021%2C%202025%2C%2012_14_42%20PM.png",
						external_url: "https://decentragri.com/plant-scans",
						properties: {
                            image: imageUri,
							cropType: data.cropType,
							timestamp: new Date().toISOString(),
							username: username,
							location: data.location,
							note: data.note ?? null,
							interpretation: data.interpretation
						},
						background_color: "#E0FFE0"
					},
					supply: "1"
				}
			};

			await engine.erc1155.mintTo(CHAIN, PLANT_SCAN_EDITION_ADDRESS, ENGINE_ADMIN_WALLET_ADDRESS, metadata);
		} catch (error) {
			console.error("Error minting plant scan NFT:", error);
			throw new Error("Failed to mint plant scan NFT");
		}
	}
}

export default PlantData;
