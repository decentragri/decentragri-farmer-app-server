

export const createFarmCypher: string = `
    MATCH (u:User {username: $username})
    CREATE (f:Farm {
      id: $id,
      farmName: $farmName,
      cropType: $cropType,
      owner: $owner,
      description: $description,
      createdAt: $createdAt,
      updatedAt: $updatedAt,
      image: $image,
      lat: $lat,
      lng: $lng
    })
    MERGE (u)-[:OWNS]->(f)
    RETURN f
  `

/**
 * Cypher query to retrieve recent soil readings and plant scans for a specific farm owned by a user.
 *
 * @remarks
 * - Matches a user by `username` and their owned farm by `farmName`.
 * - Optionally matches soil readings (`Reading`) and plant scans (`PlantScan`) associated with the farm,
 *   filtering both by a cutoff datetime.
 * - Returns collections of soil readings and plant scans that are newer than the specified cutoff.
 *
 * @param {string} $username - The username of the user.
 * @param {string} $farmName - The name of the farm.
 * @param {string} $cutoff - The cutoff datetime (ISO 8601 string) to filter recent readings and scans.
 *
 * @returns {Object} An object containing:
 *   - `soilReadings`: Array of recent soil reading nodes.
 *   - `plantScans`: Array of recent plant scan nodes.
 */
export const getRecentFarmScansCypher: string = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {name: $farmName})
    OPTIONAL MATCH (f)-[:HAS_SOIL_READING]->(soil:Reading)
        WHERE soil.createdAt >= datetime($cutoff)
    OPTIONAL MATCH (f)-[:HAS_PLANT_SCAN]->(PlantScan:PlantScan)
        WHERE PlantScan.date >= datetime($cutoff)
    RETURN collect(soil) AS soilReadings, collect(PlantScan) AS plantScans
	`

export const getFarmListCypher: string = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm)
    RETURN f.id as id, 
           f.farmName as farmName, 
           f.cropType as cropType, 
           f.description as description, 
           f.createdAt as createdAt, 
           f.updatedAt as updatedAt, 
           f.coordinates as coordinates,
           f.image as image,
           f.owner as owner,
           f.lat as lat, 
           f.lng as lng
`
