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
import type { PlantScanResult, ParsedInterpretation } from "./data.interface";





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
					MERGE (f:Farm {name: $farmName})
					MERGE (u)-[:OWNS]->(f)
					MERGE (p:PlantScan {
						cropType: $cropType,
						date: $date,
						note: $note,
						lat: $lat,
						lng: $lng,
						interpretation: $interpretation
					})
					MERGE (f)-[:HAS_PLANT_SCAN]->(p)
					`,
					{
						username: username,
						farmName: data.farmName,
						cropType: data.cropType ?? null,
						date: new Date().toISOString(),
						note: data.note ?? null,
						lat: data.location?.lat ?? null,
						lng: data.location?.lng ?? null,
						interpretation: data.interpretation
					}
				)
			),
			await this.savePlantScanToNFT(data, data.imageBytes, username)
		]);

		} catch (err) {
			console.error("Error saving plant scan:", err);
			throw new Error("Failed to save plant scan");
		} finally {
			await session.close();
		}
	}

	/**
	 * Retrieve all plant scans for the authenticated user.
	 * @param token - Auth token
	 * @returns Array of PlantScanResult objects
	 */
	public async getPlantScans(token: string): Promise<PlantScanResult[]> {
		const driver: Driver = getDriver();
		const session: Session | undefined = driver?.session();
		const tokenService: TokenService = new TokenService();

		if (!session) {
			throw new Error("Unable to create database session.");
		}

		try {
			const username: string = await tokenService.verifyAccessToken(token);

			const query = `
				MATCH (u:User {username: $username})-[:OWNS]->(:Farm)-[:HAS_PLANT_SCAN]->(p:PlantScan)
				RETURN p ORDER BY p.date DESC
			`;

			const result: QueryResult = await session.executeRead((tx: ManagedTransaction) =>
				tx.run(query, { username })
			);

			return result.records.map((record) => {
				const raw = record.get("p").properties;

				let parsedInterpretation: ParsedInterpretation;
				try {
					parsedInterpretation = JSON.parse(raw.interpretation);
				} catch (_) {
					parsedInterpretation = raw.interpretation;
				}

				return {
					cropType: raw.cropType,
					note: raw.note,
					lat: raw.lat,
					lng: raw.lng,
					createdAt: raw.date,
					interpretation: parsedInterpretation
				} as PlantScanResult;
			});
		} catch (error) {
			console.error("Error fetching plant scans:", error);
			throw new Error("Failed to fetch plant scans");
		} finally {
			await session.close();
		}
	}




	/**
	 * Retrieve plant scans for a specific farm.
	 * @param token - Auth token
	 * @param farmName - Name of the farm to filter by
	 * @returns Array of PlantScanResult objects
	 */
	public async getPlantScansByFarm(token: string, farmName: string): Promise<PlantScanResult[]> {
	const driver: Driver = getDriver();
	const session: Session | undefined = driver?.session();
	const tokenService: TokenService = new TokenService();

	if (!session) {
		throw new Error("Unable to create database session.");
	}

	try {
		const username: string = await tokenService.verifyAccessToken(token);

		const query = `
			MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {name: $farmName})-[:HAS_PLANT_SCAN]->(p:PlantScan)
			RETURN p ORDER BY p.date DESC
		`;

		const result: QueryResult = await session.executeRead((tx: ManagedTransaction) =>
			tx.run(query, { username, farmName })
		);

		return result.records.map((record) => {
			const raw = record.get("p").properties;

			let parsedInterpretation: ParsedInterpretation;
			try {
				parsedInterpretation = JSON.parse(raw.interpretation);
			} catch (_) {
				parsedInterpretation = raw.interpretation;
			}

			return {
				cropType: raw.cropType,
				note: raw.note,
				lat: raw.lat,
				lng: raw.lng,
				createdAt: raw.date,
				interpretation: parsedInterpretation
			} as PlantScanResult;
		});
	} catch (error) {
		console.error("Error fetching plant scans by farm:", error);
		throw new Error("Failed to fetch plant scans for farm");
	} finally {
		await session.close();
	}
	}



	/**
	 * Mint NFT representing the plant image analysis.
	 */
	private async savePlantScanToNFT(
		data: PlantImageSessionParams & { interpretation: string },
		image: string,
		username: string
	): Promise<void> {
		const driver: Driver = getDriver();
		const walletService = new WalletService(driver);
		const smartWalletAddress: string = await walletService.getSmartWalletAddress(username);

		const byteImage: number[] = JSON.parse(image);
		const buffer: Buffer = Buffer.from(byteImage);
		const imageUri = await uploadPicBuffer(buffer, data.cropType);

		try {
			// Optionally summarize interpretation for traits
			const attributes = [
				{
					trait_type: "AI Evaluation",
					value: data.interpretation
					
				},
				{
					trait_type: "Crop Type",
					value: data.cropType
				}
			];

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
							username,
							location: data.location,
							note: data.note ?? "No additional notes",
							interpretation: data.interpretation
						},
						attributes,
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
