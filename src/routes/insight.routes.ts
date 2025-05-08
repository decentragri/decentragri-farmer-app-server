
//** ELYSIA IMPORT */
import type Elysia from "elysia";

//** SERVICE IMPORTS */
import OnChainService from "../onchain.services/onchain.service";


//** SCHEMA IMPORTS */
import { authBearerSchema } from "../auth.services/auth.schema";





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





}

export default Insight;