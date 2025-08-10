export interface StakeInfo {
    stakeAmount: string;          // Raw wei amount
    rewardAmountAccrued: string;  // Raw wei amount
    stakeAmountFormatted: string; // Human-readable amount (e.g., "10.5")
    rewardAmountFormattedAccrued: string; // Human-readable amount (e.g., "381.111")
}

export interface StakerInfo {
    timeOfLastUpdate: string;           // Raw uint128 as string
    conditionIdOflastUpdate: string;    // Raw uint64 as string
    amountStaked: string;               // Raw wei amount
    unclaimedRewards: string;           // Raw wei amount
    amountStakedFormatted: string;      // Human-readable amount (e.g., "10.5")
    unclaimedRewardsFormatted: string;  // Human-readable amount (e.g., "381.111")
}

export interface ReleaseTimeFrame {
    timeUnit: string;           // Raw uint80 as string (time unit in seconds)
    timeUnitFormatted: string;  // Human-readable format (e.g., "3600 seconds (1 hour)")
}