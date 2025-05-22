//**SERVICE IMPORTS */
import PlantImageRunner from "../ai.services/plant.ai.team.service/plant.main";

//** SCHEMA & INTERFACE IMPORTS */
import type Elysia from "elysia";
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import { plantImageSessionSchema } from "../data.services/plant.schema";


const PlantAI = (app: Elysia) => {
        app.post('api/save-plant-readings', async ({ headers, body }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const output: SuccessMessage  = await PlantImageRunner.analyzeFromApi(jwtToken, body);
            
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }

      }, plantImageSessionSchema
   )

}

export default PlantAI
