import { t } from "elysia";


export const farmerCreateFarmSchema = {
    headers: t.Object({ authorization: t.String() }),
    body: t.Object({
        farmName: t.String(),
        cropType: t.String(), // List of crop types planted in the farm
        description: t.Optional(t.String())
    })
};

export const farmerGetFarmListSchema = {
    headers: t.Object({ authorization: t.String() })
};

export const farmerUpdateFarmSchema = {
    headers: t.Object({ authorization: t.String() }),
    body: t.Object({
        id: t.String(), // Unique identifier for the farm
        farmName: t.String(),
        cropType: t.String(), // List of crop types planted in the farm
        description: t.Optional(t.String()),


    })
};
