//** MEMGRAPH DRIVER AND TYPES
import { Driver, ManagedTransaction, Session, type QueryResult } from "neo4j-driver";
import { getDriver } from "../db/memgraph";
import { notificationService } from "../notification.services/notification.service";
import { NotificationType } from "../notification.services/notification.interface";

//** TYPE IMPORTS */
import type { SensorReadingsWithInterpretation } from "../ai.services/soil.ai.team.service/soil.types"

/**
 * Formats a date string to 'Month Day, Year - Hour:Minute AM/PM' format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
const formatDate = (dateString: string | Date): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

//** UTILS IMPORT */
import WalletService, { engine } from "../wallet.services/wallet.service";

//** CONFIG IMPORTS */
import { CHAIN, ENGINE_ADMIN_WALLET_ADDRESS, SCAN_EDITION_ADDRESS } from "../utils/constants";

//**SERVICE IMPORTS */
import TokenService from "../security.services/token.service";
import { getSensorDataByFarmCypher, saveSensorDataCypher, getRecentSoilReadingsCypher, getLastSoilReadingInterpretationCypher, getSoilReadingsByDateRangeCypher } from "../soilanalysis.services/soilanalysisdata.cypher";




class SoilAnalysisService {

    /**
     * Saves sensor data to the database and IPFS.
     * @param sensorReadings - The sensor readings to save.
     * @param username - The username of the user saving the data.
     */
    public async saveSoilAnalysisData(sensorReadings: SensorReadingsWithInterpretation, username: string): Promise<void> {
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
                        cropType: sensorReadings.cropType,
                        id: sensorReadings.id,
                        submittedAt: sensorReadings.submittedAt

                    }
                )
            ),
            // Save to IPFS
            this.saveSoilAnalysisDataToNFT(sensorReadings, username)
        ]);

        // Send notification
        try {
            await notificationService.sendRealTimeNotification(username, {
                type: NotificationType.SOIL_ANALYSIS_SAVED,
                title: 'Soil Analysis Saved',
                message: `New soil analysis data has been saved for farm ${sensorReadings.farmName}`,
                metadata: {
                    farmName: sensorReadings.farmName,
                    sensorId: sensorId,
                    timestamp: sensorReadings.submittedAt
                }
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
            // Don't throw the error as we don't want to fail the main operation
        }

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
    public async getSoilAnalysisData(token: string): Promise<SensorReadingsWithInterpretation[]> {
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
                    RETURN s.sensorId AS sensorId, r AS reading, i.value AS interpretation, f.name AS farmName, r.createdAt AS createdAt, r.submittedAt AS submittedAt
                    ORDER BY r.createdAt DESC
                `;
            } else {
                const username = await tokenService.verifyAccessToken(token);
                query = `
                    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm)-[:HAS_SENSOR]->(s:Sensor)
                    MATCH (s)-[:HAS_READING]->(r:Reading)
                    OPTIONAL MATCH (r)-[:INTERPRETED_AS]->(i:Interpretation)
                    RETURN s.sensorId AS sensorId, r AS reading, i.value AS interpretation, f.name AS farmName, r.createdAt AS createdAt, r.submittedAt AS submittedAt
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
                const createdAt = record.get("createdAt");
                const submittedAt = record.get("submittedAt");

                const reading: SensorReadingsWithInterpretation = readingNode.properties;

                const formattedCreatedAt: string = formatDate(createdAt);
                const formattedSubmittedAt: string = formatDate(submittedAt);

                return {
                    id: reading.id,
                    farmName: farmName ?? "Unknown Farm",
                    fertility: reading.fertility,
                    moisture: reading.moisture,
                    ph: reading.ph,
                    temperature: reading.temperature,
                    sunlight: reading.sunlight,
                    humidity: reading.humidity,
                    cropType: reading.cropType,
                    createdAt: createdAt,
                    formattedCreatedAt: formattedCreatedAt,
                    sensorId: sensorId,
                    submittedAt: submittedAt,
                    formattedSubmittedAt: formattedSubmittedAt,
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
    public async getSoilAnalysisDataByFarm(token: string, farmName: string): Promise<SensorReadingsWithInterpretation[]> {
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
            const createdAt = record.get("createdAt");
            const submittedAt = record.get("submittedAt");

            const formattedCreatedAt = formatDate(createdAt);
            const formattedSubmittedAt = formatDate(submittedAt);

			const reading: SensorReadingsWithInterpretation = readingNode.properties;

			return {
				submittedAt: submittedAt,
				id: reading.id,
				fertility: reading.fertility,
				moisture: reading.moisture,
				ph: reading.ph,
				temperature: reading.temperature,
				sunlight: reading.sunlight,
				humidity: reading.humidity,
				cropType: reading.cropType,
				createdAt: createdAt,
				sensorId: sensorId,
				interpretation: interpretation ?? "No interpretation",
                formattedCreatedAt: formattedCreatedAt,
                formattedSubmittedAt: formattedSubmittedAt,
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
    public async saveSoilAnalysisDataToNFT(sensorReadings: SensorReadingsWithInterpretation, username: string) {
        const driver: Driver = getDriver();
        const walletService = new WalletService(driver);
        const smartWalletAddress: string = await walletService.getSmartWalletAddress(username)

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
    

    /**
	 * Retrieve recent soil readings for RAG context
	 * @param username - User's username
	 * @param farmName - Farm name
	 * @param cropType - Crop type to match
	 * @param limit - Number of recent readings to retrieve (default: 5)
	 * @returns Promise<SensorReadingsWithInterpretation[]>
	 */
	public async getRecentSoilReadingsForRAG(
		username: string, 
		farmName: string, 
		cropType: string, 
		limit: number = 5
	): Promise<SensorReadingsWithInterpretation[]> {
		const driver = getDriver();
		const session = driver?.session();

		if (!session) {
			throw new Error("Unable to create database session.");
		}

		try {
			const result = await session.executeRead(tx =>
				tx.run(getRecentSoilReadingsCypher, { username, farmName, cropType, limit })
			);

			const readings: SensorReadingsWithInterpretation[] = [];
			
			for (const record of result.records) {
				const reading = record.get("r").properties;
				const interpretation = record.get("interpretation");
				
				// Parse interpretation if it's a JSON string
				let parsedInterpretation: any;
				try {
					parsedInterpretation = typeof interpretation === 'string' ? JSON.parse(interpretation) : interpretation;
				} catch {
					parsedInterpretation = {
						evaluation: "Unknown",
						fertility: "No data",
						moisture: "No data",
						ph: "No data",
						temperature: "No data",
						sunlight: "No data",
						humidity: "No data"
					};
				}

				readings.push({
					...reading,
					formattedCreatedAt: formatDate(reading.createdAt),
					formattedSubmittedAt: formatDate(reading.submittedAt),
					interpretation: parsedInterpretation
				});
			}

			return readings;
		} catch (error) {
			console.error("Error fetching recent soil readings for RAG:", error);
			return []; // Return empty array instead of throwing to not break AI analysis
		} finally {
			await session.close();
		}
	}

	/**
	 * Get the most recent soil reading for similarity comparison
	 * @param username - User's username
	 * @param farmName - Farm name
	 * @param cropType - Crop type to match
	 * @returns Promise with sensor values and interpretation
	 */
	public async getLastSoilReadingForComparison(
		username: string, 
		farmName: string, 
		cropType: string
	): Promise<{
		fertility: number;
		moisture: number;
		ph: number;
		temperature: number;
		sunlight: number;
		humidity: number;
		interpretation: string;
		createdAt: string;
	} | null> {
		const driver = getDriver();
		const session = driver?.session();

		if (!session) {
			throw new Error("Unable to create database session.");
		}

		try {
			const result = await session.executeRead(tx =>
				tx.run(getLastSoilReadingInterpretationCypher, { username, farmName, cropType })
			);

			if (result.records.length === 0) {
				return null;
			}

			const record = result.records[0];
			return {
				fertility: record.get("r.fertility"),
				moisture: record.get("r.moisture"),
				ph: record.get("r.ph"),
				temperature: record.get("r.temperature"),
				sunlight: record.get("r.sunlight"),
				humidity: record.get("r.humidity"),
				interpretation: record.get("interpretation") || "No interpretation available",
				createdAt: record.get("r.createdAt")
			};
		} catch (error) {
			console.error("Error fetching last soil reading:", error);
			return null;
		} finally {
			await session.close();
		}
	}

	/**
	 * Generate RAG context summary from historical soil readings
	 * @param username - User's username
	 * @param farmName - Farm name
	 * @param cropType - Crop type to match
	 * @returns String summary of historical context
	 */
	public async generateSoilRAGContext(
		username: string, 
		farmName: string, 
		cropType: string
	): Promise<string> {
		try {
			const recentReadings = await this.getRecentSoilReadingsForRAG(username, farmName, cropType, 3);
			
			if (recentReadings.length === 0) {
				return "No previous soil readings found for this crop type and farm. This is the first soil analysis.";
			}

			let context = `Historical Soil Analysis Context (Last ${recentReadings.length} readings for ${cropType} at ${farmName}):\n\n`;
			
			recentReadings.forEach((reading, index) => {
				const readingDate = new Date(reading.createdAt);
				const daysAgo = Math.floor((Date.now() - readingDate.getTime()) / (1000 * 60 * 60 * 24));
				
				context += `Reading ${index + 1} (${daysAgo} days ago):\n`;
				context += `- Date: ${reading.formattedCreatedAt}\n`;
				context += `- Sensor Values:\n`;
				context += `  * Fertility: ${reading.fertility} µS/cm\n`;
				context += `  * Moisture: ${reading.moisture}%\n`;
				context += `  * pH: ${reading.ph}\n`;
				context += `  * Temperature: ${reading.temperature}°C\n`;
				context += `  * Sunlight: ${reading.sunlight} lux\n`;
				context += `  * Humidity: ${reading.humidity}%\n`;
				
				if (reading.interpretation) {
					context += `- Previous Analysis:\n`;
					context += `  * Overall Evaluation: ${reading.interpretation.evaluation || 'N/A'}\n`;
					if (reading.interpretation.fertility) context += `  * Fertility: ${reading.interpretation.fertility}\n`;
					if (reading.interpretation.moisture) context += `  * Moisture: ${reading.interpretation.moisture}\n`;
					if (reading.interpretation.ph) context += `  * pH: ${reading.interpretation.ph}\n`;
					if (reading.interpretation.temperature) context += `  * Temperature: ${reading.interpretation.temperature}\n`;
					if (reading.interpretation.sunlight) context += `  * Sunlight: ${reading.interpretation.sunlight}\n`;
					if (reading.interpretation.humidity) context += `  * Humidity: ${reading.interpretation.humidity}\n`;
				}
				context += `\n`;
			});

			context += `Please consider this historical context when analyzing the current soil readings. Look for:\n`;
			context += `- Trends in soil conditions over time\n`;
			context += `- Seasonal variations in readings\n`;
			context += `- Consistency or changes in soil health patterns\n`;
			context += `- Effectiveness of previous recommendations\n`;
			context += `- Progressive improvements or deteriorations\n`;

			return context;
		} catch (error) {
			console.error("Error generating soil RAG context:", error);
			return "Unable to retrieve historical soil analysis context.";
		}
	}




}

export default SoilAnalysisService