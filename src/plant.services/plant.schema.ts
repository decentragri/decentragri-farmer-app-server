import { t } from "elysia";

export const plantImageSessionSchema = {
    headers: t.Object({ authorization: t.String() }),
	body: t.Object({
		imageBytes: t.String(), // Stringified PackedByteArray
		cropType: t.String(),
		farmName: t.String(),
		note: t.Optional(t.String())
	})
};
