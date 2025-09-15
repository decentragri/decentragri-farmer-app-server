// CLASS IMPORTS
import PestTeam from './pest.ai.team';
import TokenService from '../../security.services/token.service';
import PestService from '../../pest.services.ts/pest.service';
import { getDriver } from '../../db/memgraph';

// TYPE IMPORTS
import type { Driver, Session, ManagedTransaction } from 'neo4j-driver';
import type { SuccessMessage } from '../../onchain.services/onchain.interface';
import type { PestRiskForecastParams, PestScanResult } from './pest.interface';

class PestRiskForecastRunner {
	/**
	 * Run the pest risk forecast based on recent farm data and weather.
	 * @param token - JWT token for authentication
	 * @param params - PestRiskForecastParams containing farm and location info
	 * @returns SuccessMessage with result status
	 */
	public static async analyzeFromApi(token: string, params: PestRiskForecastParams): Promise<SuccessMessage> {
		const tokenService = new TokenService();
		const pestTeam = new PestTeam();

		try {
			// Authenticate user
			const username = await tokenService.verifyAccessToken(token);
			console.log(`Running pest risk forecast for user: ${username}, farm: ${params.farmName}`);

			// Launch AI pest risk analysis
			const output = await pestTeam.start({
				farmName: params.farmName,
				username,
				location: params.location,
				cropType: params.cropType
			});

			if (output.status !== 'FINISHED') {
				console.warn('Pest AI task did not finish cleanly.');
				throw new Error('Pest forecast AI did not return a complete result.');
			}

			const interpretation = output.result as unknown as string;

			// Check for invalid crop/scan issues flagged by AI
			if (
				interpretation.includes("Invalid cropType") ||
				interpretation.includes("does not appear to contain a plant")
			) {
				console.warn("Pest AI returned an invalid result:", interpretation);
				return { error: interpretation };
			}

			// Save AI output to database
			await this.savePestScan({
				...params,
				interpretation,
				createdAt: new Date().toISOString()
			}, username);

			console.log('Pest risk forecast completed and saved successfully.');
			return { success: "Pest risk forecast complete" };

		} catch (error: any) {
			console.error("Failed to complete pest risk forecast:", error.message || error);
			throw new Error("Failed to complete pest risk forecast.");
		}
	}

	/**
	 * Save pest scan to the graph DB.
	 * Enforces 1 scan per 3 days per farm per user.
	 */
	private static async savePestScan( data: PestScanResult, username: string): Promise<void> {
		const driver: Driver = getDriver();
		const session: Session | undefined = driver?.session();
        const pestService = new PestService();

		if (!session) throw new Error("Unable to create database session.");

		try {
			// Check if pest scan exists within 3 days for this farm and user
			const recentScanCheck = await session.executeRead((tx: ManagedTransaction) =>
				tx.run(
					`
					MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {name: $farmName})
					MATCH (f)-[:HAS_PEST_SCAN]->(ps:PestScan)
					WHERE datetime(ps.createdAt) > datetime() - duration({days: 3})
					RETURN ps
					`,
					{
						username,
						farmName: data.farmName
					}
				)
			);

			if (recentScanCheck.records.length > 0) {
				throw new Error("A pest scan was already recorded for this farm within the last 3 days.");
			}

			// Insert new pest scan record
			await session.executeWrite((tx: ManagedTransaction) =>
				tx.run(
					`
					MERGE (u:User {username: $username})
					MERGE (f:Farm {name: $farmName})
					MERGE (u)-[:OWNS]->(f)
					CREATE (ps:PestScan {
						cropType: $cropType,
						lat: $lat,
						lng: $lng,
						interpretation: $interpretation,
						createdAt: $createdAt
					})
					MERGE (f)-[:HAS_PEST_SCAN]->(ps)
					`,
					{
						username,
						farmName: data.farmName,
						cropType: data.cropType ?? null,
						lat: data.location?.lat ?? null,
						lng: data.location?.lng ?? null,
						interpretation: data.interpretation,
						createdAt: data.createdAt
					}
				)
			);

            // TODO: Implement savePestScanToNFT method in PestService
            // await pestService.savePestScanToNFT(data, username);
            console.log("Pest scan saved to database:", data);
            
		} catch (err) {
			console.error("Error saving pest scan:", err);
			throw err;
		} finally {
			await session.close();
		}
	}
}

export default PestRiskForecastRunner;
