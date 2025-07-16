import { t } from "elysia";

export const getSoilAnalysisByFarmSchema = {
    headers: t.Object({ authorization: t.String() }),
    params: t.Object({ farmName: t.String() })
};
    