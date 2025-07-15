




/**
 * Cypher query string to save a plant scan in the Neo4j database.
 *
 * This query performs the following operations:
 * - Merges (creates if not exists) a `User` node identified by the provided `username`.
 * - Merges a `Farm` node identified by the provided `farmName`.
 * - Creates an `OWNS` relationship from the user to the farm.
 * - Merges a `PlantScan` node with the specified properties: `cropType`, `date`, `note`, `lat`, `lng`, and `interpretation`.
 * - Creates a `HAS_PLANT_SCAN` relationship from the farm to the plant scan.
 *
 * @constant
 * @type {string}
 * @param {string} $username - The username of the user.
 * @param {string} $farmName - The name of the farm.
 * @param {string} $cropType - The type of crop scanned.
 * @param {string} $date - The date of the plant scan.
 * @param {string} $note - Additional notes about the scan.
 * @param {number} $lat - Latitude coordinate of the scan.
 * @param {number} $lng - Longitude coordinate of the scan.
 * @param {string} $interpretation - Interpretation or result of the scan.
 */
export const savePlantScanCypher: string = 					`
    MERGE (u:User {username: $username})
    MERGE (f:Farm {farmName: $farmName})
    MERGE (u)-[:OWNS]->(f)
    MERGE (p:PlantScan {
        cropType: $cropType,
        date: $date,
        note: $note,
        id: $id,
        imageUri: $imageUri,
        interpretation: $interpretation
    })
    MERGE (f)-[:HAS_PLANT_SCAN]->(p)
    `
