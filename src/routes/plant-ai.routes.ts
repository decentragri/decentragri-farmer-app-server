//**SERVICE IMPORTS */
import WalletService from "../wallet.services/wallet.service";
import OnChainService, { type RSWETHToEthRate } from "../onchain.services/onchain.service";

//** SCHEMA & INTERFACE IMPORTS */
import type Elysia from "elysia";
import { authBearerSchema } from "../auth.services/auth.schema";
import { stakeETHSchema } from "../onchain.services/onchain.schema";
import { tokenTransferSchema } from "../wallet.services/wallet.schema";
import type { SuccessMessage } from "../onchain.services/onchain.interface";


const PlantAI = (app: Elysia) => {
        app.post('/api/onchain/stake/eth', async ({ headers, body }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const onChainService = new PlantSer
            


            const output: SuccessMessage = await onChainService.stakeETH(jwtToken, body);
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }

      }, stakeETHSchema
   )

}

export default PlantAI
