//**SERVICE IMPORTS */
import WalletService from "../wallet.services/wallet.service";
import OnChainService, { type RSWETHToEthRate } from "../onchain.services/onchain.service";

//** SCHEMA & INTERFACE IMPORTS */
import type Elysia from "elysia";
import { authBearerSchema } from "../auth.services/auth.schema";
import { stakeETHSchema } from "../onchain.services/onchain.schema";
import { tokenTransferSchema } from "../wallet.services/wallet.schema";
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import { getDriver } from "../db/memgraph";



const OnChain = (app: Elysia) => {

    app.get('/api/onchain/eth-rsweth/rate', async ({ headers }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const onChainService = new OnChainService;
            const output = await onChainService.ethToRswETHRate(jwtToken);

            return output;
        } catch (error) {
            console.error(error);
            throw error;
        }
      }, authBearerSchema
    )

    .get('/api/onchain/rsweth-eth/price', async ({ headers }): Promise<RSWETHToEthRate> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const onChainService = new OnChainService;
            const output = await onChainService.rswETHToEthRate(jwtToken);

            return output;
        } catch (error) {
            console.error(error);
            throw error;
        }
      }
    , authBearerSchema
    )

    .get('/api/onchain/reward-percentage/price', async ({ headers }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const onChainService = new OnChainService;
            const output = await onChainService.swellTreasuryRewardPercentage(jwtToken);
            return output;
        } catch (error) {
            console.error(error);
            throw error;
        }
      }, authBearerSchema
    )

    .post('/api/onchain/stake/eth', async ({ headers, body }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const onChainService = new OnChainService;
            


            const output: SuccessMessage = await onChainService.stakeETH(jwtToken, body);
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }

      }, stakeETHSchema
   )

   .post('/api/onchain/token/transfer', async ({ headers, body }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const driver = getDriver();
            const walletService = new WalletService(driver);
            const output: SuccessMessage = await walletService.transferToken(jwtToken, body);
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }

      }, tokenTransferSchema
    )


}

export default OnChain;