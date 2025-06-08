
//** MEMGRAPH DRIVER
import { Driver, ManagedTransaction, Session } from 'neo4j-driver-core'

//** BCRYPT IMPORT
import { hash, compare } from 'bcrypt-ts'

//** UUID GENERATOR
import { nanoid } from "nanoid"

//**TYPE IMPORTS */
import type { TokenScheme } from '../security.services/security.service.interface';

//**SERVICE IMPORT
import WalletService from '../wallet.services/wallet.service';
import TokenService from '../security.services/token.service';

//** CONFIG IMPORT */
import { SALT_ROUNDS } from '../utils/constants';
import type { SuccessMessage } from '../onchain.services/onchain.interface';
import { getDriver } from '../db/memgraph';
import type { FarmScanResult, PlantScanResult } from './data.interface';
import type { SensorReadingsWithInterpretation } from '../ai.services/soil.ai.team.service/soil.types';





class FarmData {



    public async getRecentFarmScans(username: string, farmName: string): Promise<FarmScanResult> {
	const driver: Driver = getDriver();
	const session: Session = driver.session();

	// Compute cutoff date 7 days ago (in ISO 8601)
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const query = `
		MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {name: $farmName})
		OPTIONAL MATCH (f)-[:HAS_SOIL_READING]->(soil:Reading)
			WHERE soil.createdAt >= datetime($cutoff)
		OPTIONAL MATCH (f)-[:HAS_PLANT_SCAN]->(plant:PlantScan)
			WHERE plant.date >= datetime($cutoff)
		RETURN collect(soil) AS soilReadings, collect(plant) AS plantScans
	`;

	const result = await session.executeRead((tx) =>
		tx.run(query, {
			username,
			farmName,
			cutoff: sevenDaysAgo
		})
	);

	const record = result.records[0];
	await session.close();

	return {
		soilReadings: record.get("soilReadings").map((r: any) => r.properties),
		plantScans: record.get("plantScans").map((p: any) => p.properties),
	};
}



}

export default FarmData;