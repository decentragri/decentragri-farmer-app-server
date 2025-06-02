
//** ELYSIA IMPORT */
import type Elysia from "elysia";

//** SERVICE IMPORTS */
import AuthService from "../auth.services/auth.service";
import ProfileService from "../profile.services/profile.service";

//** MEMGRAPH IMPORt */
import { getDriver } from "../db/memgraph";

//** TYPE IMPORTS */


//** SCHEMA IMPORTS */
import { authBearerSchema, loginSchema, registerSchema } from "../auth.services/auth.schema";
import type { UserLoginResponse } from "../auth.services/auth.interface";
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import { uploadProfilePictureSchema } from "../profile.services/profile.schema";




const Profile = (app: Elysia) => {
    app.get('/api/profile', async ({ headers }): Promise<UserLoginResponse> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const profileService = new ProfileService(driver);

            const output = await profileService.getProfile(jwtToken);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
        }, authBearerSchema 
    )
    
    .post('/api/profile/picture', async ({ headers, body }): Promise<SuccessMessage> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const driver = getDriver();
            const profileService = new ProfileService(driver);

            const output = await profileService.uploadProfilePic(jwtToken, body);
            return output;

        } catch (error) {
            console.error(error);
            throw error;
        }
        }, uploadProfilePictureSchema
    )
    







}

export default Profile;