
//** MEMGRAPH DRIVER
import { getDriver } from '../db/memgraph';

//**SERVICE IMPORT
import TokenService from '../security.services/token.service';

//** TYPE IMPORTS */
import type { Farmer } from './community.interface';
import type { CreatedFarm } from '../farmer.services/farmer.interface';
import type { SuccessMessage } from '../onchain.services/onchain.interface';


class CommunityService {
    public async getFarmers(token: string): Promise<Farmer[]> {
    const tokenService = new TokenService();
    await tokenService.verifyAccessToken(token);

	const driver = getDriver();
	const session = driver.session();
	try {
		const result = await session.executeRead((tx) =>
			tx.run(
				`
				MATCH (u:User)-[:FARMER]->(f:Farm)
				RETURN u.username AS username,
					   u.walletAddress AS walletAddress,
					   u.level AS level,
					   u.experience AS experience,
					   f.name AS farmName
				`
			)
		);

		const farmers: Farmer[] = result.records.map((record) => ({
			username: record.get('username'),
            experience: record.get('experience'),
			level: record.get('level'),
            createdAt: record.get('createdAt'),
            rank: record.get('rank'),
		}));

		return farmers;
	} catch (error) {
		console.error("Error retrieving farmers:", error);
		throw new Error("Failed to retrieve farmers.");
	} finally {
		await session.close();
	}
    }


    public async getFarmerByUsername(token: string, username: string): Promise<Farmer>{
        const tokenService = new TokenService();
        await tokenService.verifyAccessToken(token);

        const driver = getDriver();
        const session = driver.session();
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})-[:FARMER]->(f:Farm)
                    RETURN u.username AS username,
                           u.walletAddress AS walletAddress,
                           u.level AS level,
                           u.experience AS experience,
                           f.name AS farmName
                    `,
                    { username }
                )
            );

            const record = result.records[0];
            return {
                username: record.get('username'),
                experience: record.get('experience'),
                level: record.get('level'),
                createdAt: record.get('createdAt'),
                rank: record.get('rank'),
            };
        } catch (error) {
            console.error("Error retrieving farmer:", error);
            throw new Error("Failed to retrieve farmer.");
        } finally {
            await session.close();
        }
    }


    public async getFarms(token: string): Promise<CreatedFarm[]> {
        const tokenService = new TokenService();
        await tokenService.verifyAccessToken(token);

        const driver = getDriver();
        const session = driver.session();
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
                    MATCH (f:Farm)
                    RETURN f.name AS farmName,
                           f.cropType AS cropType,
                           f.description AS description,
                           f.image AS image,
                           f.location AS location
                    `
                )
            );

            const farms: CreatedFarm[] = result.records.map((record) => ({
                farmName: record.get('farmName'),
                cropType: record.get('cropType'),
                description: record.get('description'),
                id: record.get('id'),
                image: record.get('image'),
                owner: record.get('owner'),
                updatedAt: new Date(),
                createdAt: new Date(),
                lat: record.get('lat'),
                lng: record.get('lng'),
            }));

            return farms;
        } catch (error) {
            console.error("Error retrieving farms:", error);
            throw new Error("Failed to retrieve farms.");
        } finally {
            await session.close();
        }
    }


    public async getFarmByName(token: string, farmName: string): Promise<CreatedFarm> {
        const tokenService = new TokenService();
        await tokenService.verifyAccessToken(token);

        const driver = getDriver();
        const session = driver.session();
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
                    MATCH (f:Farm {name: $farmName})
                    RETURN f.name AS farmName,
                           f.cropType AS cropType,
                           f.description AS description,
                           f.image AS image,
                           f.location AS location,
                           f.id AS id,
                           f.owner AS owner,
                           f.createdAt AS createdAt,
                           f.updatedAt AS updatedAt
                    `,
                    { farmName }
                )
            );

            const record = result.records[0];
            return {
                farmName: record.get('farmName'),
                cropType: record.get('cropType'),
                description: record.get('description'),
                image: record.get('image'),
                id: record.get('id'),
                owner: record.get('owner'),
                createdAt: new Date(record.get('createdAt')),
                updatedAt: new Date(record.get('updatedAt')),
                lat: record.get('location').lat,
                lng: record.get('location').lng,
            };
        } catch (error) {
            console.error("Error retrieving farm:", error);
            throw new Error("Failed to retrieve farm.");
        } finally {
            await session.close();
        }
    }


    public async followFarmer(token: string, targetUsername: string): Promise<SuccessMessage> {
        const tokenService = new TokenService();
        await tokenService.verifyAccessToken(token);

        const driver = getDriver();
        const session = driver.session();
        try {
            const username = await tokenService.verifyAccessToken(token);
            const result = await session.executeWrite((tx) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username}), (f:User {username: $targetUsername})
                    CREATE (u)-[:FOLLOWS]->(f)
                    RETURN u.username AS username, f.username AS targetUsername
                    `,
                    { username, targetUsername }
                )
            );

            if (result.records.length === 0) {
                throw new Error("Failed to follow farmer.");
            }

            return{ success: `Successfully followed ${username}` };
        } catch (error) {
            console.error("Error following farmer:", error);
            throw new Error("Failed to follow farmer.");
        } finally {
            await session.close();
        }
    }


    public async unfollowFarmer(token: string, targetUsername: string): Promise<SuccessMessage>  {
        const tokenService = new TokenService();
        await tokenService.verifyAccessToken(token);

        const driver = getDriver();
        const session = driver.session();
        try {
            const username = await tokenService.verifyAccessToken(token);
            const result = await session.executeWrite((tx) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})-[r:FOLLOWS]->(f:User {username: $targetUsername})
                    DELETE r
                    RETURN u.username AS username, f.username AS targetUsername
                    `,
                    { username, targetUsername }
                )
            );

            if (result.records.length === 0) {
                throw new Error("Failed to unfollow farmer.");
            }

            return { success: `Successfully unfollowed ${username}` };
        } catch (error) {
            console.error("Error unfollowing farmer:", error);
            throw new Error("Failed to unfollow farmer.");
        } finally {
            await session.close();
        }
    }


    public async getFollowers(token: string,): Promise<Farmer[]> {
        const tokenService = new TokenService();
        const username = await tokenService.verifyAccessToken(token);



        const driver = getDriver();
        const session = driver.session();
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})<-[:FOLLOWS]-(f:User)
                    RETURN f.username AS username,
                           f.level AS level,
                           f.experience AS experience,
                           f.createdAt AS createdAt,
                           f.rank AS rank
                    `,
                    { username }
                )
            );

            const followers: Farmer[] = result.records.map((record) => ({
                username: record.get('username'),
                level: record.get('level'),
                experience: record.get('experience'),
                createdAt: record.get('createdAt'),
                rank: record.get('rank'),
            }));

            return followers;
        } catch (error) {
            console.error("Error retrieving followers:", error);
            throw new Error("Failed to retrieve followers.");
        } finally {
            await session.close();
        }
    }


    public async getFollowing(token: string): Promise<Farmer[]> {
        const tokenService = new TokenService();
        const username = await tokenService.verifyAccessToken(token);

        const driver = getDriver();
        const session = driver.session();
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})-[:FOLLOWS]->(f:User)
                    RETURN f.username AS username,
                           f.level AS level,
                           f.experience AS experience,
                           f.createdAt AS createdAt,
                           f.rank AS rank
                    `,
                    { username }
                )
            );

            const following: Farmer[] = result.records.map((record) => ({
                username: record.get('username'),
                level: record.get('level'),
                experience: record.get('experience'),
                createdAt: record.get('createdAt'),
                rank: record.get('rank'),
            }));

            return following;
        } catch (error) {
            console.error("Error retrieving following:", error);
            throw new Error("Failed to retrieve following.");
        } finally {
            await session.close();
        }
    }


    public async getMutualFollowers(token: string): Promise<Farmer[]> {
        const tokenService = new TokenService();
        const username = await tokenService.verifyAccessToken(token);

        const driver = getDriver();
        const session = driver.session();
        try {
            const result = await session.executeRead((tx) =>
                tx.run(
                    `
                    MATCH (u:User {username: $username})-[:FOLLOWS]->(f:User)<-[:FOLLOWS]-(u2:User)
                    RETURN f.username AS username,
                           f.level AS level,
                           f.experience AS experience,
                           f.createdAt AS createdAt,
                           f.rank AS rank
                    `,
                    { username }
                )
            );

            const mutualFollowers: Farmer[] = result.records.map((record) => ({
                username: record.get('username'),
                level: record.get('level'),
                experience: record.get('experience'),
                createdAt: record.get('createdAt'),
                rank: record.get('rank'),
            }));

            return mutualFollowers;
        } catch (error) {
            console.error("Error retrieving mutual followers:", error);
            throw new Error("Failed to retrieve mutual followers.");
        } finally {
            await session.close();
        }
    }

    
}

export default CommunityService;