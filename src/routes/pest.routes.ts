//**SERVICE IMPORTS */
import PestRiskForecastRunner from "../ai.services/pest.ai.team.service/pest.main";

//** SCHEMA & INTERFACE IMPORTS */
import type Elysia from "elysia";
import type { SuccessMessage } from "../onchain.services/onchain.interface";

//** SCHEMA IMPORTS */
import { pestRiskForecastParamsSchema } from "../ai.services/pest.ai.team.service/pest.schema";
import { authBearerSchema } from "../auth.services/auth.schema";
import PestData from "../data.services/pest.data";


const PestAI = (app: Elysia) => {
    app.post('api/receive/pest-forecast', async ({ headers, body }) => {
    try {
        const authorizationHeader = headers.authorization;
        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            throw new Error('Bearer token not found in Authorization header');
        }
        const jwtToken: string = authorizationHeader.substring(7);
        

        const output: SuccessMessage  = await PestRiskForecastRunner.analyzeFromApi(jwtToken, body);
        return output;
    } catch (error: any) {
        console.error(error);
        throw error;
    }

      }, pestRiskForecastParamsSchema
   )
   .get('api/get-pest-risk-forecasts/:farmName', async ({ headers, params }) => {
        try {
            const authorizationHeader = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            
            const pestData = new PestData();
            const output = await pestData.getPestScans(jwtToken, params.farmName);

            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, authBearerSchema
    )



}

export default PestAI
