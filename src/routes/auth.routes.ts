
//** ELYSIA IMPORT */
import type Elysia from "elysia";

//** SERVICE IMPORTS */
import AuthService from "../auth.services/auth.service";

//** MEMGRAPH IMPORt */
import { getDriver } from "../db/memgraph";

//** TYPE IMPORTS */
import type { userLoginResponse } from "../auth.services/auth.interface";

//** SCHEMA IMPORTS */
import { authBearerSchema, loginSchema, registerSchema } from "../auth.services/auth.schema";




const Auth = (app: Elysia) => {



    app.post('/api/register/decentra', async ({ body }): Promise<userLoginResponse> => {
        try {
            const driver = getDriver();
            const authService = new AuthService(driver);

            const output = await authService.register(body)
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
      }, registerSchema
    )
    .post('/api/login/decentra', async ({ body }): Promise<userLoginResponse> => {
        try {
            const driver = getDriver();
            const authService = new AuthService(driver);

            const output = await authService.login(body)
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
      }, loginSchema
    )

    .post('/api/validate-session/decentra', async ({ headers }): Promise<userLoginResponse> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const authService = new AuthService(driver);

            const output = await authService.validateSession(jwtToken)
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
      }, authBearerSchema
    )

    .post('/api/renew/access/decentra', async ({ headers }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const authService = new AuthService(driver);

            const output = await authService.refreshSession(jwtToken)
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
      }, authBearerSchema
    )




}

export default Auth;