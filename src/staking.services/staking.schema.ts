import { t } from "elysia";

export const stakeTokenSchema = {
    headers: t.Object({ authorization: t.String() }),
    body: t.Object({
        amount: t.String() // Amount of tokens to stake (will be converted to wei)
    })
};

export const getStakeInfoSchema = {
    headers: t.Object({ authorization: t.String() })
};

export const withdrawTokenSchema = {
    headers: t.Object({ authorization: t.String() }),
    body: t.Object({
        amount: t.String() // Amount of tokens to withdraw (will be converted to wei)
    })
};

export const claimRewardsSchema = {
    headers: t.Object({ authorization: t.String() })
};
