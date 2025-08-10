// Individual ABI fragments for staking contract functions
// This reduces URI length by only sending relevant ABI parts

export const STAKE_ABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "stake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

export const GET_STAKE_INFO_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_staker",
                "type": "address"
            }
        ],
        "name": "getStakeInfo",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "_tokensStaked",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_rewards",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

export const STAKERS_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "stakers",
        "outputs": [
            {
                "internalType": "uint128",
                "name": "timeOfLastUpdate",
                "type": "uint128"
            },
            {
                "internalType": "uint64",
                "name": "conditionIdOflastUpdate",
                "type": "uint64"
            },
            {
                "internalType": "uint256",
                "name": "amountStaked",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "unclaimedRewards",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

export const CLAIM_REWARDS_ABI = [
    {
        "inputs": [],
        "name": "claimRewards",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

export const WITHDRAW_ABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

export const GET_TIME_UNIT_ABI = [
    {
        "inputs": [],
        "name": "getTimeUnit",
        "outputs": [
            {
                "internalType": "uint80",
                "name": "_timeUnit",
                "type": "uint80"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

export const DEPOSIT_REWARD_TOKENS_ABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "depositRewardTokens",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

export const GET_REWARD_TOKEN_BALANCE_ABI = [
    {
        "inputs": [],
        "name": "getRewardTokenBalance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
