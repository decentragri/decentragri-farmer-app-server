import { t } from "elysia";

export const plantImageSessionSchema = {
    headers: t.Object({ authorization: t.String() }),
	body: t.Object({
		imageBytes: t.String(), // Stringified PackedByteArray
		cropType: t.String(),
		location: t.Optional(
			t.Object({
				lat: t.Number(),
				lng: t.Number()
			})
		),
		note: t.Optional(t.String())
	})
};
