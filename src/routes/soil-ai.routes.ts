//** ELYSIA IMPORT
import Elysia from 'elysia';

//** SERVICE IMPORTS */
import SoilSensorRunner from '../ai.services/soil.ai.team.service/soil.main';
import { sensorSessionSchema } from '../ai.services/soil.ai.team.service/soil.schema';
import SensorData from '../data.services/soilsensor.data';
import { authBearerSchema } from '../auth.services/auth.schema';
import type { SensorReadingsWithInterpretation } from '../ai.services/soil.ai.team.service/soil.types';


const SoilAi = (app: Elysia) => {
    app.post('api/save-sensor-readings', async ({ headers, body }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const output = await SoilSensorRunner.analyzeFromApi(jwtToken, body);
    
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, sensorSessionSchema
    )

    .get('api/get-sensor-readings', async ({ headers }): Promise<SensorReadingsWithInterpretation[]> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const sensorData = new SensorData();
            const output = await sensorData.getSensorData(jwtToken);
    
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, authBearerSchema
    )

    
    
}

export default SoilAi;