

export const profilePictureCypher = `
            MATCH (u:User {username: $userName})
            CREATE (p:ProfilePic {
              id: $id,
              image: $image,
              uploadedAt: $uploadedAt,
              fileFormat: $fileFormat,
              fileSize: $fileSize,
              likes: []
            })
            CREATE (u)-[:HAS_PROFILE_PIC]->(p)
            `