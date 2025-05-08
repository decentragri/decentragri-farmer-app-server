import { t } from "elysia";




export const stakeETHSchema = {
    headers: t.Object({ authorization: t.String() }),
    body: t.Object({
        ethAmount: t.String()
    })

}