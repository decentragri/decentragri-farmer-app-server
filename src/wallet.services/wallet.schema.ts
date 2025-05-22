import { t } from "elysia";






export const tokenTransferSchema = {
    headers: t.Object({ authorization: t.String() }),
    body: t.Object({
        receiver: t.String(),
        tokenName: t.String(),
        amount: t.String()
    })
};


