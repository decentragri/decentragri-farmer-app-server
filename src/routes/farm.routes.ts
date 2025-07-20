//**SERVICE IMPORTS */
import FarmService from "../farm.services/farm.service";

//** ELYSIA IMPORTS */
import type Elysia from "elysia";

//** SCHEMA & INTERFACE IMPORTS */
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import type { CreatedFarm, FarmList } from "../farm.services/farm.interface";
import { farmerCreateFarmSchema, farmerUpdateFarmSchema } from "../farm.services/farm.schema";
import { authBearerSchema } from "../auth.services/auth.schema";

//** MEMGRAPH IMPORTS */
import { getDriver } from "../db/memgraph";



const Farmer = (app: Elysia) => {
    app.post('api/create/farm', async ({ headers, body }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const farmService = new FarmService(driver);

            const output: SuccessMessage = await farmService.createFarm(jwtToken, body);
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }

      }, farmerCreateFarmSchema
    )


    .get('api/list/farm', async ({ headers }): Promise<FarmList[]> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const farmerService = new FarmService(driver);

            const output: FarmList[] = await farmerService.getFarmList(jwtToken);
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }
      }, authBearerSchema
    )


    .get('api/data/farm/:id', async ({ headers, params }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const farmService = new FarmService(driver);

            const output: CreatedFarm = await farmService.getFarmData(jwtToken, params.id);
            return output;
        }
        catch (error: any) {
            console.error(error);
            throw error;
        }
    }, authBearerSchema
    )


    .post('api/update/farm/', async ({ headers, body }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const farmService = new FarmService(driver);

            const output: SuccessMessage = await farmService.updateFarm(jwtToken, body);
            return output;

        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, farmerUpdateFarmSchema
    )


    .post('api/delete/farm/:id', async ({ headers, params }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const farmerService = new FarmService(driver);

            const output: SuccessMessage = await farmerService.deleteFarm(jwtToken, params.id);
            return output;

        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, authBearerSchema
    )



    .post('api/sell/farm/:id', async ({ headers, params }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const farmerService = new FarmService(driver);

            const output: SuccessMessage = await farmerService.sellFarm(jwtToken, params.id);
            return output;

        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, authBearerSchema
    )
    



    

}

export default Farmer
