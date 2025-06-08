import { t } from 'elysia';

export const pestRiskForecastParamsSchema = {
    headers: t.Object({
        authorization: t.String(),
    }),

    body: t.Object({
        farmName: t.String(),
        username: t.String(),
        location: t.Object({
            lat: t.Number(),
            lng: t.Number(),
        }),
        cropType: t.String(),

    }),
};


