//** MEMGRAPH DRIVER AND TYPES
import { Driver, ManagedTransaction, Session, type QueryResult } from "neo4j-driver";
import { getDriver } from "../db/memgraph";

//** TYPE IMPORTS */
import type { SensorReadings, SensorReadingsWithInterpretation } from "../ai.services/soil.ai.team.service/soil.types"

//** UTILS IMPORT */
import WalletService, { engine } from "../wallet.services/wallet.service";

//** CONFIG IMPORTS */
import { CHAIN, ENGINE_ADMIN_WALLET_ADDRESS, SCAN_EDITION_ADDRESS } from "../utils/constants";

//**SERVICE IMPORTS */
import TokenService from "../security.services/token.service";
import { getSensorDataByFarmCypher, saveSensorDataCypher } from "./data.cypher";




class SensorData {

    /**
     * Saves sensor data to the database and IPFS.
     * @param sensorReadings - The sensor readings to save.
     * @param username - The username of the user saving the data.
     */
    public async saveSensorData(sensorReadings: SensorReadingsWithInterpretation, username: string): Promise<void> {
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();
    
        if (!session) {
            throw new Error("Unable to create database session.");
        }
    
        const { sensorId, interpretation, createdAt } = sensorReadings;
        try {
        await Promise.all([
            session.executeWrite((tx: ManagedTransaction) =>
                tx.run(saveSensorDataCypher,
                    {
                        sensorId,
                        createdAt,
                        interpretation,
                        username,
                        farmName: sensorReadings.farmName,
                        fertility: sensorReadings.fertility,
                        moisture: sensorReadings.moisture,
                        ph: sensorReadings.ph,
                        temperature: sensorReadings.temperature,
                        sunlight: sensorReadings.sunlight,
                        humidity: sensorReadings.humidity,
                        cropType: sensorReadings.cropType ?? null,
                    }
                )
            ),

            // Save to IPFS
            await this.saveSensorDataToNFT(sensorReadings)
        ]);

        } catch (error: any) {
            console.error("Error saving sensor data:", error);
            throw new Error("Failed to save sensor data");
        } finally {
            await session.close();
        }
    }
    
    
    /**
     * Fetches sensor data for a specific user.
     * @param username - The username of the user.
     * @returns An array of sensor readings with interpretations.
     */
    public async getSensorData(token: string): Promise<SensorReadingsWithInterpretation[]> {
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();
        const tokenService: TokenService = new TokenService();

        const isServiceToken = token === process.env.SENSOR_FEED_SERVICE_JWT;
        let query: string;
        let params: Record<string, unknown> = {};

        if (!session) {
            throw new Error("Unable to create database session.");
        }

        try {
            if (isServiceToken) {
                query = `
                    MATCH (u:User)-[:OWNS]->(f:Farm)-[:HAS_SENSOR]->(s:Sensor)
                    MATCH (s)-[:HAS_READING]->(r:Reading)
                    OPTIONAL MATCH (r)-[:INTERPRETED_AS]->(i:Interpretation)
                    RETURN s.sensorId AS sensorId, r AS reading, i.value AS interpretation, f.name AS farmName
                    ORDER BY r.createdAt DESC
                `;
            } else {
                const username = await tokenService.verifyAccessToken(token);
                query = `
                    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm)-[:HAS_SENSOR]->(s:Sensor)
                    MATCH (s)-[:HAS_READING]->(r:Reading)
                    OPTIONAL MATCH (r)-[:INTERPRETED_AS]->(i:Interpretation)
                    RETURN s.sensorId AS sensorId, r AS reading, i.value AS interpretation, f.name AS farmName
                    ORDER BY r.createdAt DESC
                `;
                params.username = username;
            }

            const result: QueryResult = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(query, params)
            );

            return result.records.map((record) => {
                const readingNode = record.get("reading");
                const sensorId = record.get("sensorId");
                const interpretation = record.get("interpretation");
                const farmName = record.get("farmName");

                const reading: SensorReadingsWithInterpretation = readingNode.properties;

                return {
                    farmName: farmName ?? "Unknown Farm",
                    fertility: reading.fertility,
                    moisture: reading.moisture,
                    ph: reading.ph,
                    temperature: reading.temperature,
                    sunlight: reading.sunlight,
                    humidity: reading.humidity,
                    cropType: reading.cropType,
                    username: reading.username,
                    createdAt: reading.createdAt,
                    sensorId: sensorId,
                    id: reading.id,
                    interpretation: interpretation ?? "No interpretation"
                };
            });
        } catch (error: any) {
            console.error("Error fetching sensor data:", error);
            throw new Error("Failed to fetch sensor data");
        } finally {
            await session.close();
        }
    }

    /**
     * Fetches sensor data for a specific farm.
     * @param token - The user's access token.
     * @param farmName - The name of the farm to fetch data for.
     * @returns An array of sensor readings with interpretations for the specified farm.
     */
    public async getSensorDataByFarm(token: string, farmName: string): Promise<SensorReadingsWithInterpretation[]> {
	const driver: Driver = getDriver();
	const session: Session | undefined = driver?.session();
	const tokenService: TokenService = new TokenService();

	if (!session) {
		throw new Error("Unable to create database session.");
	}

	try {
		const username = await tokenService.verifyAccessToken(token);
		const params = { username, farmName };

		const result: QueryResult = await session.executeRead((tx: ManagedTransaction) =>
			tx.run(getSensorDataByFarmCypher, params)
		);

		return result.records.map((record) => {
			const readingNode = record.get("reading");
			const sensorId = record.get("sensorId");
			const interpretation = record.get("interpretation");
			const farmName = record.get("farmName");

			const reading: SensorReadingsWithInterpretation = readingNode.properties;

			return {
				fertility: reading.fertility,
				moisture: reading.moisture,
				ph: reading.ph,
				temperature: reading.temperature,
				sunlight: reading.sunlight,
				humidity: reading.humidity,
				cropType: reading.cropType,
				username: reading.username,
				createdAt: reading.createdAt,
				sensorId: sensorId,
				id: reading.id,
				interpretation: interpretation ?? "No interpretation",
				farmName
			};
		});
	} catch (error: any) {
		console.error("Error fetching farm sensor data:", error);
		throw new Error("Failed to fetch farm sensor data");
	} finally {
		await session.close();
	}
    }

    
    /**
     * Saves sensor data to IPFS and mints an NFT.
     * @param sensorReadings - The sensor readings to save.
     */
    public async saveSensorDataToNFT(sensorReadings: SensorReadingsWithInterpretation) {
        const driver: Driver = getDriver();
        const walletService = new WalletService(driver);
        const smartWalletAddress: string = await walletService.getSmartWalletAddress(sensorReadings.username)

        try {

            const scanMetadata = {
                receiver: smartWalletAddress,
                metadataWithSupply: {
                    metadata: {
                        name: "Soil Scan NFT",
                        description: "This NFT represents a scan of soil sensor data.",
                        image: "https://d391b93f5f62d9c15f67142e43841acc.ipfscdn.io/ipfs/QmdRtWRHQwEkKA7nciqRQmgW7y6yygT589aogfUYaoc3Ea/ChatGPT%20Image%20Apr%2021%2C%202025%2C%2012_14_42%20PM.png",
                        external_url: "https://decentragri.com/home",
                        properties: {
                            cropType: sensorReadings.cropType,
                            timestamp: sensorReadings.createdAt,
                            username: sensorReadings.username,
                            source: "DecentrAgri AI",
                            interpretation: sensorReadings.interpretation // 👈 full object saved here
                        },
                        attributes: [
                            { trait_type: "Fertility", value: sensorReadings.interpretation?.fertility },
                            { trait_type: "Moisture", value: sensorReadings.interpretation?.moisture },
                            { trait_type: "pH", value: sensorReadings.interpretation?.ph },
                            { trait_type: "Temperature", value: sensorReadings.interpretation?.temperature },
                            { trait_type: "Sunlight", value: sensorReadings.interpretation?.sunlight },
                            { trait_type: "Humidity", value: sensorReadings.interpretation?.humidity },
                            { trait_type: "Evaluation", value: sensorReadings.interpretation?.evaluation ?? "Unknown" },
                            { trait_type: "Interpretation", value: sensorReadings.interpretation }
                        ],
                        background_color: "#F0F0F0"
                    },
                    supply: "1"
                }
            };
            
    
            await engine.erc1155.mintTo(CHAIN, SCAN_EDITION_ADDRESS, ENGINE_ADMIN_WALLET_ADDRESS, scanMetadata);
    
        } catch (error: any) {
            console.error('Error saving sensor data as an NFT:', error);
            throw new Error('Failed to save sensor data as an NFT');
        }
    }
    

    




}

export default SensorData