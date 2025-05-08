import { t } from 'elysia';

export const sensorSessionSchema = {
	headers: t.Object({
		authorization: t.String()
	}),
	body: t.Object({
		sensorData: t.Object({
			fertility: t.Number(),
			moisture: t.Number(),
			ph: t.Number(),
			temperature: t.Number(),
			sunlight: t.Number(),
			humidity: t.Number(),
			username: t.String(),
			sensorId: t.String(),
			cropType: t.String(),
		}),

	})
};
