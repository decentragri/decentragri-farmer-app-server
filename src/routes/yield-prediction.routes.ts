//** ELYSIA IMPORT */
import Elysia from 'elysia';

//** SERVICE IMPORTS */
import YieldPredictionRunner from "../ai.services/yield.prediction.service/yield.main";
import type { YieldPredictionParams } from "../ai.services/yield.prediction.service/yield.interface";
import { getYieldPredictionsSchema, yieldPredictionSchema } from '../ai.services/yield.prediction.service/yield.schema';



const YieldPrediction = (app: Elysia) => {
    app.post("/api/predict-yield", async ({ headers, body }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const result = await YieldPredictionRunner.generatePrediction(jwtToken, body as YieldPredictionParams);
            return result;
        } catch (error: any) {
            console.error("Error in yield prediction route:", error);
            return { error: "Failed to generate yield prediction" };
        }
    }, yieldPredictionSchema)
    
    .get("/api/yield-predictions/:farmName/:cropType", async ({ headers, params, query }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const { farmName, cropType } = params;
            const limit = parseInt(query.limit as string) || 5;

            const result = await YieldPredictionRunner.getRecentPredictions(jwtToken, farmName, cropType, limit);
            return result;
        } catch (error: any) {
            console.error("Error in get yield predictions route:", error);
            return { error: "Failed to fetch yield predictions" };
        }
    }, getYieldPredictionsSchema);
}

export default YieldPrediction;
