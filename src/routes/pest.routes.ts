//**SERVICE IMPORTS */
import PestRiskForecastRunner from "../ai.services/pest.ai.team.service/pest.main";
import PestService from "../pest.services.ts/pest.service";
import type { PestData } from "../pest.services.ts/pest.interface";

//** SCHEMA & INTERFACE IMPORTS */
import type Elysia from "elysia";
import type { SuccessMessage } from "../onchain.services/onchain.interface";

//** SCHEMA IMPORTS */
import { pestRiskForecastParamsSchema, pestReportSchema } from "../ai.services/pest.ai.team.service/pest.schema";
import { authBearerSchema } from "../auth.services/auth.schema";


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
   .post('api/save-pest-report', async ({ headers, body }) => {
        try {
            const authorizationHeader = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            
            const pestService = new PestService();
            const output: SuccessMessage = await pestService.savePestReport(jwtToken, body);
            
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, pestReportSchema
   )
   .get('api/get-pest-reports', async ({ headers }) => {
        try {
            const authorizationHeader = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            
            const pestService = new PestService();
            const output = await pestService.getPestReports(jwtToken);
            
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, authBearerSchema
   )
//    .get('api/get-pest-risk-forecasts/:farmName', async ({ headers, params }) => {
//         try {
//             const authorizationHeader = headers.authorization;
//             if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
//                 throw new Error('Bearer token not found in Authorization header');
//             }
//             const jwtToken: string = authorizationHeader.substring(7);
            
//             const pestData = new PestData();
//             const output = await pestData.getPestScans(jwtToken, params.farmName);

//             return output;
//         } catch (error: any) {
//             console.error(error);
//             throw error;
//         }
//     }, authBearerSchema
//     )



}

export default PestAI
