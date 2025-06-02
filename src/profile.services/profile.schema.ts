import { t } from "elysia";

export const uploadProfilePictureSchema = {
    headers: t.Object({
        authorization: t.String()
    }),
    body: t.Object({
        bufferData: t.String()
    })
};