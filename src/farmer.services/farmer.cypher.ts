

export const createFarmCypher: string = `
    MATCH (u:User {username: $username})
    CREATE (f:Farm {
      id: $id,
      farmName: $farmName,
      cropType: $cropType,
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