

export const createFarmCypher: string = `
    MATCH (u:User {username: $username})
    CREATE (f:Farm {
      id: $farmId,
      farmName: $farmName,
      crop: $crop,
      description: $description,
      createdAt: $createdAt,
      updatedAt: $updatedAt,
      image: $image,
      location: $location
    })
    MERGE (u)-[:OWNS]->(f)
    RETURN f
  `