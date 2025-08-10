//** SERVICE IMPORTS */
import StakingService from "../staking.services/staking.service";

//** ELYSIA IMPORTS */
import type Elysia from "elysia";

//** SCHEMA & INTERFACE IMPORTS */
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import type { StakeInfo } from "../staking.services/staking.service";
import { stakeTokenSchema, getStakeInfoSchema } from "../staking.services/staking.schema";



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
    }, getStakeInfoSchema);

    return app;
};

export default Staking;
