//** SERVICE IMPORTS */
import StakingService from "../staking.services/staking.service";

//** ELYSIA IMPORTS */
import type Elysia from "elysia";

//** SCHEMA & INTERFACE IMPORTS */
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import type { StakeInfo, StakerInfo, ReleaseTimeFrame } from "../staking.services/staking.interface";
import { stakeTokenSchema, getStakeInfoSchema, withdrawTokenSchema, claimRewardsSchema } from "../staking.services/staking.schema";



const Staking = (app: Elysia) => {
    app.post('/api/stake/tokens', async ({ headers, body }): Promise<SuccessMessage> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            
            const stakingService = new StakingService();
            await stakingService.stakeToken(jwtToken, body);
            
            return { success: `Successfully staked ${body.amount} tokens` };
        } catch (error: any) {
            console.error("Error in stake tokens route:", error);
            throw error;
        }
    }, stakeTokenSchema)

    .get('/api/stake/info', async ({ headers }): Promise<StakeInfo> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            
            const stakingService = new StakingService();
            const stakeInfo = await stakingService.getStakeInfo(jwtToken);
            
            return stakeInfo;
        } catch (error: any) {
            console.error("Error in get stake info route:", error);
            throw error;
        }
    }, getStakeInfoSchema)

    .get('/api/stake/staker', async ({ headers }): Promise<StakerInfo> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            
            const stakingService = new StakingService();
            const stakerInfo = await stakingService.getStakers(jwtToken);
            
            return stakerInfo;
        } catch (error: any) {
            console.error("Error in get staker info route:", error);
            throw error;
        }
    }, getStakeInfoSchema)

    .post('/api/stake/claim', async ({ headers }): Promise<SuccessMessage> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            
            const stakingService = new StakingService();
            await stakingService.claimRewards(jwtToken);
            
            return { success: 'Successfully claimed rewards' };
        } catch (error: any) {
            console.error("Error in claim rewards route:", error);
            throw error;
        }
    }, claimRewardsSchema)

    .post('/api/stake/withdraw', async ({ headers, body }): Promise<SuccessMessage> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            
            const stakingService = new StakingService();
            const result = await stakingService.withdraw(jwtToken, body);
            
            return result;
        } catch (error: any) {
            console.error("Error in withdraw tokens route:", error);
            throw error;
        }
    }, withdrawTokenSchema)

    .get('/api/stake/timeframe', async ({ headers }): Promise<ReleaseTimeFrame> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            
            const stakingService = new StakingService();
            const timeFrame = await stakingService.getReleaseTimeFrame(jwtToken);
            
            return timeFrame;
        } catch (error: any) {
            console.error("Error in get release time frame route:", error);
            throw error;
        }
    }, getStakeInfoSchema);

    return app;
};

export default Staking;
