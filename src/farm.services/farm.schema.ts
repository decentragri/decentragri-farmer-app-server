import { t } from "elysia";


export const farmerCreateFarmSchema = {
    headers: t.Object({ authorization: t.String() }),
    body: t.Object({
        cropType: t.String(), // List of crop types planted in the farm
        farmName: t.String(),
        note: t.Optional(t.String()),
        imageBytes: t.String(), // Optional image URL for the farm
        coordinates: t.Object({
            lat: t.Number(),
            lng: t.Number()
        })
    })
};



export const farmerUpdateFarmSchema = {
    headers: t.Object({ authorization: t.String() }),
    body: t.Object({
        id: t.String(), // Unique identifier for the farm
        farmName: t.String(),
        cropType: t.String(), // List of crop types planted in the farm
        note: t.Optional(t.String()),
        image: t.Optional(t.String()), // Optional image URL for the farm
        coordinates: t.Object({
            lat: t.Number(),
            lng: t.Number()
        })
    })
};
