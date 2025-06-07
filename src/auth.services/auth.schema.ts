import { t } from "elysia";


export const loginSchema = {
    body: t.Object({
        username: t.String(),
        password: t.String()
    })
};


export const registerSchema = {
    body: t.Object({
        username: t.String(),
        password: t.String(),
        deviceId: t.String()
    })
};


export const authBearerSchema = { 
    headers: t.Object({ authorization: t.String() })
};

export const fcmTokenSchema = {
    body: t.Object({
        token: t.String()
    }),
    headers: t.Object({ authorization: t.String() })
};
