import { t } from 'elysia';

export const sensorSessionSchema = {
	headers: t.Object({
		authorization: t.String()
	}),
	body: t.Object({
		sensorData: t.Object({
			farmName: t.String(),
			moisture: t.Number(),
			ph: t.Number(),
			temperature: t.Number(),
			fertility: t.Number(),
			sunlight: t.Number(),
			humidity: t.Number(),
			sensorId: t.String(),
		}),

	})
};
