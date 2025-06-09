
//** MEMGRAPH DRIVER
import { getDriver } from '../db/memgraph';


//**SERVICE IMPORT
import TokenService from '../security.services/token.service';

//** TYPE IMPORTS */
import type { Farmer } from './community.interface';
import type { CreatedFarm } from '../farmer.services/farmer.interface';


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

}

export default CommunityService;