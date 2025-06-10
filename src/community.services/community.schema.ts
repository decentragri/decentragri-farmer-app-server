import { t } from "elysia";

export const farmNameSchema = { 
    headers: t.Object({ authorization: t.String() }),
    params: t.Object({ farmName: t.String() })
};


export const userNameSchema = { 
    headers: t.Object({ authorization: t.String() }),
    params: t.Object({ username: t.String() })
};
