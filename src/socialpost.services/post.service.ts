
//** MEMGRAPH DRIVER
import { Driver, ManagedTransaction, Session, type QueryResult } from 'neo4j-driver-core'

class SocialPostService {
    driver?: Driver
    constructor(driver?: Driver) {
      this.driver = driver
    };
}

export default SocialPostService;