import { t } from "elysia";


export const getLastTransactionsSchema = {
    params: t.Object({
        walletAddress: t.String(),
        chain: t.String()
    }),
    headers: t.Object({ authorization: t.String() })

};
