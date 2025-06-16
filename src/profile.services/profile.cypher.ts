

export const profilePictureCypher = `
    MATCH (u:User {username: $userName})
    CREATE (p:ProfilePic {
      id: $id,
      url: $url,
      fileFormat: $fileFormat,
      fileSize: $fileSize,
      uploadedAt: $uploadedAt
    })
    MERGE (u)-[:HAS_PROFILE_PIC]->(p)
					`;
  