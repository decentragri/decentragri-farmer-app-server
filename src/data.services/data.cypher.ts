export const saveSensorDataCypher =                     `
    MERGE (u:User {username: $username})

    MERGE (f:Farm {name: $farmName})
    MERGE (u)-[:OWNS]->(f)

    MERGE (s:Sensor {sensorId: $sensorId})
    MERGE (f)-[:HAS_SENSOR]->(s)

    CREATE (r:Reading {
        fertility: $fertility,
        moisture: $moisture,
        ph: $ph,
        temperature: $temperature,
        sunlight: $sunlight,
        humidity: $humidity,
        cropType: $cropType,
        username: $username,
        createdAt: $createdAt
    })

    CREATE (i:Interpretation {
        value: $interpretation
    })

    MERGE (s)-[:HAS_READING]->(r)
    MERGE (r)-[:INTERPRETED_AS]->(i)
    `

export const getSensorDataByFarmCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {name: $farmName})-[:HAS_SENSOR]->(s:Sensor)
    MATCH (s)-[:HAS_READING]->(r:Reading)
    OPTIONAL MATCH (r)-[:INTERPRETED_AS]->(i:Interpretation)
    RETURN f.name AS farmName, s.sensorId AS sensorId, r AS reading, i.value AS interpretation
    ORDER BY r.createdAt DESC
	`