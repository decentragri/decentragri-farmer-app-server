

export const createFarmCypher: string = `
            MATCH (u:User {username: $username})
            CREATE (f:Farm {
              id: $farmId,
              farmName: $farmName,
              crop: $crop,
              description: $description,
              createdAt: datetime($createdAt),
              updatedAt: datetime($updatedAt)
            })
            MERGE (u)-[:OWNS]->(f)
            RETURN f
          `