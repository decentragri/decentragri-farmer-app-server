import { t } from "elysia";

export const plantImageSessionSchema = {
    headers: t.Object({ authorization: t.String() }),
	body: t.Object({
		imageBytes: t.String(), // Stringified PackedByteArray
		cropType: t.String(),
		date: t.String(), // ISO 8601 format
		location: t.Optional(
			t.Object({
				lat: t.Number(),
				lng: t.Number()
			})
		),
		note: t.Optional(t.String())
	})
};
