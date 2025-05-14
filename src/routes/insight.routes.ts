
//** ELYSIA IMPORT */
import type Elysia from "elysia";

//** SERVICE IMPORTS */
import OnChainService from "../onchain.services/onchain.service";
import { InsightService } from "../insight.services/insight";

//** SCHEMA IMPORTS */
import { authBearerSchema } from "../auth.services/auth.schema";
import { getLastTransactionsSchema } from "../insight.services/insight.schema";

//** TYPE IMPORTS */
import type { WalletTransactionResponse } from "../insight.services/insight.interface";





const Insight = (app: Elysia) => {
    
    app.get('/api/insight/eth/price', async ({ headers }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const onChainService = new OnChainService();
            const output = await onChainService.getETHandSWETHPrice(jwtToken);

            return output;
        } catch (error) {
            console.error(error);
            throw error;
        }
      }, authBearerSchema
    )

    .get('/api/insight/transactions/:walletAddress/:chain', async ({ params, headers }): Promise<WalletTransactionResponse> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const insightService = new InsightService();
            const output = await insightService.getLastTransactions(params.walletAddress, params.chain, jwtToken);

            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }
      }, getLastTransactionsSchema
    )





}

export default Insight;