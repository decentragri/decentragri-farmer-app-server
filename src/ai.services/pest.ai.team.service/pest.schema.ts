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

export const pestReportSchema = {
    headers: t.Object({
        authorization: t.String(),
    }),

    body: t.Object({
        pestType: t.String(),
        cropAffected: t.String(),
        severityLevel: t.Union([t.Literal(0), t.Literal(1), t.Literal(2), t.Literal(4), t.Literal(5)]),
        location: t.String(),
        dateTime: t.String(),
        image: t.Array(t.Number())
    }),
};


