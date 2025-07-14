//**SERVICE IMPORTS */
import PlantImageRunner from "../ai.services/plant.ai.team.service/plant.main";
import PlantData from "../plant.services/plantscan.service";

//** SCHEMA & INTERFACE IMPORTS */
import type Elysia from "elysia";
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import type { PlantScanResult } from "../plant.services/plantscan.interface";

import { plantImageSessionSchema } from "../plant.services/plant.schema";
import { authBearerSchema } from "../auth.services/auth.schema";




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

       .get('api/get-scan-readings', async ({ headers }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const plantData = new PlantData();
            const output: PlantScanResult[] = await plantData.getPlantScans(jwtToken);
    
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, authBearerSchema
    )

}

export default PlantAI
