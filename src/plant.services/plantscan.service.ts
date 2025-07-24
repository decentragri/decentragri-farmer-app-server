//** MEMGRAPH DRIVER AND TYPES */
import { Driver, ManagedTransaction, Session, type QueryResult } from "neo4j-driver";
import { getDriver } from "../db/memgraph";

//** TYPES */
import type { PlantImageScanParams } from "../ai.services/plant.ai.team.service/plant.interface";
//** SERVICES */
import TokenService from "../security.services/token.service";
import WalletService, { engine } from "../wallet.services/wallet.service";
import { notificationService } from "../notification.services/notification.service";
import { NotificationType, type INotification } from "../notification.services/notification.interface";

//** CONSTANTS */
import { CHAIN, CLIENT_ID, ENGINE_ADMIN_WALLET_ADDRESS, PLANT_SCAN_EDITION_ADDRESS, SECRET_KEY } from "../utils/constants";
import { uploadPicBuffer } from "../utils/utils.thirdweb";
import type { PlantScanResult, ParsedInterpretation } from "./plantscan.interface";
import { savePlantScanCypher } from "./plantscan.cypher";
import { nanoid } from "nanoid";

class PlantData {

	/**
	 * Format a date string to "Month Day, Year - HH:MMam/pm" format
	 * @param dateStr - ISO date string
	 * @returns Formatted date string
	 */
	private formatCreatedAt(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		})
			.replace(",", "") // remove comma after day
			.replace("AM", "am")
			.replace("PM", "pm");
	}

	/**
	 * Fetch and convert PNG image from IPFS
	 * @param imageUri - IPFS URI
	 * @returns Promise that resolves to Uint8Array of image bytes
	 */
	public async fetchImageBytes(imageUri: string): Promise<Uint8Array> {
		const url = this.buildIPFSUrl(imageUri);
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch image from IPFS: ${url}`);
		}
		const buf = await response.arrayBuffer();
		return new Uint8Array(buf);
	}

	/**
	 * Build proper IPFS URL from URI
	 * @param imageUri - IPFS URI
	 * @returns Full IPFS gateway URL
	 */
	public buildIPFSUrl(imageUri: string): string {
		const trimmed = imageUri.replace(/^ipfs:\/\/(.*)/, "$1");
		return `https://${CLIENT_ID}.ipfscdn.io/ipfs/${trimmed}`;
	}
	
	/**
	 * Convert raw database record to PlantScanResult
	 * @param raw - Raw database record
	 * @returns PlantScanResult object
	 */
	public async convertToPlantScanResult(raw: any): Promise<PlantScanResult> {
		let parsedInterpretation: ParsedInterpretation;
		try {
			parsedInterpretation = JSON.parse(raw.interpretation);
		} catch {
			parsedInterpretation = raw.interpretation;
		}

		const formattedCreatedAt = this.formatCreatedAt(raw.date);
		const imageBytes = await this.fetchImageBytes(raw.imageUri);

		// Convert Uint8Array to regular array for proper JSON serialization
		const imageBytesArray = Array.from(imageBytes);

		return {
			cropType: raw.cropType,
			note: raw.note,
			createdAt: raw.date,
			formattedCreatedAt,
			id: raw.id,
			imageUri: raw.imageUri,
			imageBytes: imageBytesArray,
			interpretation: parsedInterpretation,
		};
	}

	/**
	 * Saves a plant scan record to the database and stores the scan as an NFT.
	 *
	 * @param data - The parameters of the plant image scan, including farm name, crop type, location, note, interpretation, and image bytes.
	 * @param username - The username of the user performing the scan.
	 * @returns A promise that resolves when the plant scan has been saved.
	 * @throws Will throw an error if the database session cannot be created or if saving the plant scan fails.
	 */
	public async savePlantScan(data: PlantImageScanParams, username: string): Promise<void> {
		const driver: Driver = getDriver();
		const session: Session | undefined = driver?.session();

		if (!session) throw new Error("Unable to create database session.");
		const imageUri = await this.savePlantScanToNFT(data, data.imageBytes, username)
		try {
		await Promise.all([
			session.executeWrite((tx: ManagedTransaction) =>
				tx.run(savePlantScanCypher,
					{
						username: username,
						farmName: data.farmName,
						cropType: data.cropType ?? null,
						date: new Date().toISOString(),
						note: data.note ?? null,
						id: nanoid(),
						interpretation: data.interpretation,
						imageUri: imageUri
					}
				)
			),
			
		]);

		// Send notification after successful save
		const notification: Omit<INotification, 'id' | 'timestamp' | 'read'> = {
			userId: username,
			type: NotificationType.SOIL_ANALYSIS_SAVED, // Using existing type
			title: 'Plant Scan Completed',
			message: `Plant scan for ${data.farmName} has been processed successfully`,
			metadata: {
				farmName: data.farmName,
				cropType: data.cropType,
				scanDate: new Date().toISOString(),
				// @ts-ignore - interpretation might have a summary property
				summary: data.interpretation?.summary || 'No issues detected'
			}
		};
		await notificationService.sendRealTimeNotification(username, notification);

		} catch (err) {
			console.error("Error saving plant scan:", err);
			
			// Send error notification
			try {
				const errorNotification: Omit<INotification, 'id' | 'timestamp' | 'read'> = {
					userId: username,
					type: NotificationType.SYSTEM_ALERT,
					title: 'Plant Scan Failed',
					message: 'Failed to process plant scan',
					metadata: {
						error: err instanceof Error ? err.message : 'Unknown error',
						timestamp: new Date().toISOString()
					}
				};
				await notificationService.sendRealTimeNotification(username, errorNotification);
			} catch (notificationErr) {
				console.error('Failed to send error notification:', notificationErr);
			}
			
			throw new Error("Failed to save plant scan");
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
		const driver = getDriver();
		const session = driver?.session();
		const tokenService = new TokenService();

		if (!session) {
			throw new Error("Unable to create database session.");
		}

		try {
			const username = await tokenService.verifyAccessToken(token);
			const query = `
				MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})-[:HAS_PLANT_SCAN]->(p:PlantScan)
				RETURN p ORDER BY p.date DESC
			`;
			const result = await session.executeRead(tx =>
				tx.run(query, { username, farmName })
			);

			const rawRecords = result.records.map(record => record.get("p").properties);
			return Promise.all(rawRecords.map(raw => this.convertToPlantScanResult(raw)));
		} catch (error) {
			console.error("Error fetching plant scans by farm:", error);
			throw new Error("Failed to fetch plant scans for farm");
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
		const driver = getDriver();
		const session = driver?.session();
		const tokenService = new TokenService();

		if (!session) {
			throw new Error("Unable to create database session.");
		}

		try {
			const username = await tokenService.verifyAccessToken(token);
			const query = `
				MATCH (u:User {username: $username})-[:OWNS]->(f:Farm)-[:HAS_PLANT_SCAN]->(p:PlantScan)
				RETURN p ORDER BY p.date DESC
			`;
			const result = await session.executeRead(tx =>
				tx.run(query, { username })
			);

			const rawRecords = result.records.map(record => record.get("p").properties);
			return Promise.all(rawRecords.map(raw => this.convertToPlantScanResult(raw)));
		} catch (error) {
			console.error("Error fetching plant scans:", error);
			throw new Error("Failed to fetch plant scans");
		} finally {
			await session.close();
		}
	}

	/**
	 * Saves a plant scan as an NFT by uploading the image, generating metadata, and minting the NFT to the user's smart wallet.
	 *
	 * @param data - The parameters of the plant image scan, including crop type, interpretation, location, and optional note.
	 * @param image - The plant image as a JSON-encoded array of bytes.
	 * @param username - The username of the user to whom the NFT will be minted.
	 * @returns A promise that resolves when the NFT has been successfully minted.
	 * @throws Will throw an error if the NFT minting process fails.
	 */
	private async savePlantScanToNFT( data: PlantImageScanParams, image: string, username: string): Promise<string> {
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

			return imageUri;
		} catch (error) {
			console.error("Error minting plant scan NFT:", error);
			throw new Error("Failed to mint plant scan NFT");
		}
	}


	// private async savePlantScanToNFT(
	// 	data: PlantImageScanParams,
	// 	image: string,
	// 	username: string
	// ): Promise<void> {
	// 	const client = createThirdwebClient({
	// 		secretKey: SECRET_KEY,
	// 	});
	
	// 	const serverWallet = Engine.serverWallet({
	// 		client,
	// 		address: "0xDCec5A8Fa6e26A04Ed94967475C7b13E9Ff56dE5", // your admin wallet address
	// 		vaultAccessToken: process.env.VAULT_ACCESS_TOKEN!,
	// 	});
	
	// 	const byteImage: number[] = JSON.parse(image);
	// 	const buffer: Buffer = Buffer.from(byteImage);
	// 	const imageFile: File = new File([buffer], "plant-scan.png", {
	// 		type: "image/png",
	// 	});
	
	// 	const contract = getContract({
	// 		client,
	// 		address: PLANT_SCAN_EDITION_ADDRESS,
	// 		chain: polygon, // or "mumbai", or any chain you configured
	// 	});
	
	// 	const attributes = [
	// 		{
	// 			trait_type: "AI Evaluation",
	// 			value: data.interpretation,
	// 		},
	// 		{
	// 			trait_type: "Crop Type",
	// 			value: data.cropType,
	// 		},
	// 	];
	
	// 	const metadata = {
	// 		name: "Plant Health NFT",
	// 		description: "Visual health check of crop using AI analysis.",
	// 		image: imageFile,
	// 		external_url: "https://decentragri.com/plant-scans",
	// 		background_color: "#E0FFE0",
	// 		properties: {
	// 			image: "Uploaded via buffer", // fallback text
	// 			cropType: data.cropType,
	// 			timestamp: new Date().toISOString(),
	// 			username,
	// 			note: data.note ?? "No additional notes",
	// 			interpretation: data.interpretation,
	// 		},
	// 		attributes,
	// 	};

	// 	const transaction = mintTo({
	// 		contract,
	// 		to: serverWallet.address, // receiver smart wallet
	// 		supply: 1n,
	// 		nft: metadata,
	// 	});
	
	// 	try {

	// 		const { transactionId } = await serverWallet.enqueueTransaction({
	// 			transaction,
	// 		  })
			


	// 	} catch (error) {
	// 		console.error("Error minting plant scan NFT:", error);
	// 		throw new Error("Failed to mint plant scan NFT");
	// 	}
	// }

}

export default PlantData;
