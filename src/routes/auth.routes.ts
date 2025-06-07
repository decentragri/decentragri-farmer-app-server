
//** ELYSIA IMPORT */
import type Elysia from "elysia";

//** SERVICE IMPORTS */
import AuthService from "../auth.services/auth.service";

//** MEMGRAPH IMPORt */
import { getDriver } from "../db/memgraph";

//** TYPE IMPORTS */
import type { UserLoginResponse } from "../auth.services/auth.interface";
import type { SuccessMessage } from "../onchain.services/onchain.interface";

//** SCHEMA IMPORTS */
import { authBearerSchema, fcmTokenSchema, loginSchema, registerSchema } from "../auth.services/auth.schema";





const Auth = (app: Elysia) => {
    app.post('/api/register/decentra', async ({ body }): Promise<UserLoginResponse> => {
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


    .post('/api/login/decentra', async ({ body }): Promise<UserLoginResponse> => {
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


    .post('/api/validate-session/decentra', async ({ headers }): Promise<UserLoginResponse> => {
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


    .post('/api/save/fcm-token/android', async ({ headers, body }): Promise<SuccessMessage> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const authService = new AuthService(driver);

            const output: SuccessMessage = await authService.saveFcmToken(jwtToken, body)
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
      }, fcmTokenSchema
    )




}

export default Auth;