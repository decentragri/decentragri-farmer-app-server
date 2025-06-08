
//** MEMGRAPH DRIVER
import { Driver, Session } from 'neo4j-driver-core'


//**TYPE IMPORTS */
import type { FarmScanResult} from './data.interface';

//**SERVICE IMPORT


//** CONFIG IMPORT */
import { getDriver } from '../db/memgraph';

//**CYPHER IMPORTS */
import { getRecentFarmScansCypher } from './data.cypher';





class FarmDataService {
    /**
        * Retrieves recent farm scan results for a specific user and farm within the last 7 days.
        *
        * @param username - The username associated with the farm scans.
        * @param farmName - The name of the farm to retrieve scans for.
        * @returns A promise that resolves to a `FarmScanResult` object containing arrays of soil readings and plant scans.
        *
        * @throws Will throw an error if the database query fails.
        */
        public async getRecentFarmScans(username: string, farmName: string): Promise<FarmScanResult> {
           const driver: Driver = getDriver();
           const session: Session = driver.session();

           try {
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

              const result = await session.executeRead((tx) =>
                 tx.run(getRecentFarmScansCypher, {
                    username,
                    farmName,
                    cutoff: sevenDaysAgo
                 })
              );

              const record = result.records[0];

              return {
                 soilReadings: record.get("soilReadings").map((r: any) => r.properties),
                 plantScans: record.get("plantScans").map((p: any) => p.properties),
              };
           } catch (error) {
              throw new Error(`Failed to retrieve recent farm scans: ${error}`);
           } finally {
              await session.close();
           }
        }



}

export default FarmDataService;