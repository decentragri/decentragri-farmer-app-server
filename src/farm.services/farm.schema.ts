import { t } from "elysia";


export const farmerCreateFarmSchema = {
    headers: t.Object({ authorization: t.String() }),
    body: t.Object({
        farmName: t.String(),
        cropType: t.String(), // List of crop types planted in the farm
        description: t.Optional(t.String()),
        image: t.Optional(t.String()), // Optional image URL for the farm
        location: t.Optional(t.Object({
            lat: t.Number(), // Latitude of the farm location
            lng: t.Number() // Longitude of the farm location
        }))
    })
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
