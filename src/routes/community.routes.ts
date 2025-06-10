import type Elysia from "elysia";
import type { Farmer } from "../community.services/community.interface";
import CommunityService from "../community.services/community.service";
import { authBearerSchema } from "../auth.services/auth.schema";
import type { CreatedFarm } from "../farmer.services/farmer.interface";
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import { farmNameSchema, userNameSchema } from "../community.services/community.schema";


const Community = (app: Elysia) => {
    app.get('/api/farmers/all', async ({ headers }): Promise<Farmer[]> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const communityService = new CommunityService()
            const output = await communityService.getFarmers(jwtToken);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }, authBearerSchema
    )


    .get('/api/farmers/:username', async ({ params, headers }): Promise<Farmer> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const { username } = params;

            const communityService = new CommunityService()
            const output = await communityService.getFarmerByUsername(username, jwtToken);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }, userNameSchema
    )


    .get('/api/farm/all', async ({ headers }): Promise<CreatedFarm[]> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const communityService = new CommunityService()
            const output: CreatedFarm[] = await communityService.getFarms(jwtToken);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }, authBearerSchema
    )


    .get('/api/farm/:farmName', async ({ params, headers }): Promise<CreatedFarm> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const communityService = new CommunityService()
            const output: CreatedFarm = await communityService.getFarmByName(params.farmName, jwtToken);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }, farmNameSchema
    )


    .post('/api/farmers/follow/:username', async ({ params, headers }): Promise<SuccessMessage> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const { username } = params;

            const communityService = new CommunityService()
            const output = await communityService.followFarmer(username, jwtToken);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    , userNameSchema
    )


    .post('/api/farmers/unfollow/:username', async ({ params, headers }): Promise<SuccessMessage> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const { username } = params;

            const communityService = new CommunityService()
            const output = await communityService.unfollowFarmer(username, jwtToken);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    , userNameSchema
    )


    .post('/api/farmers/block/:username', async ({ params, headers }): Promise<SuccessMessage> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const { username } = params;

            const communityService = new CommunityService()
            const output = await communityService.blockFarmer(username, jwtToken);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    , userNameSchema
    )


    .post('/api/farmers/unblock/:username', async ({ params, headers }): Promise<SuccessMessage> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const communityService = new CommunityService()
            const output = await communityService.unblockFarmer(jwtToken, params.username);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    , userNameSchema
    )

    
    .get('/api/farmers/following/:username', async ({ headers, params }): Promise<Farmer[]> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const communityService = new CommunityService()
            const output = await communityService.getFollowing(jwtToken, params.username);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    , userNameSchema
    )


    .get('/api/farmers/followers/:username', async ({ headers, params }): Promise<Farmer[]> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const communityService = new CommunityService()
            const output = await communityService.getFollowers(jwtToken, params.username);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    , userNameSchema
    )


    .get('/api/farmers/blocked/:username', async ({ headers, params }): Promise<Farmer[]> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const communityService = new CommunityService()
            const output = await communityService.getBlockedFarmers(jwtToken, params.username);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    , userNameSchema
    )
    
}

export default Community;
