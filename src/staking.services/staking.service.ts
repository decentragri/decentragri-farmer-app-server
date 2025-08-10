//** CONFIG IMPORTS */
import { getDriver } from "../db/memgraph";
import TokenService from "../security.services/token.service";
import { CHAIN, FARMER_CREDIT_TOKEN, STAKING_ADDRESS } from "../utils/constants";

//** ENGINE IMPORT */
import WalletService, { engine } from "../wallet.services/wallet.service";

//** ETHERS IMPORT */
import { parseEther, formatEther } from "ethers";

export interface StakeInfo {
    stakeAmount: string;          // Raw wei amount
    rewardAmountAccrued: string;  // Raw wei amount
    stakeAmountFormatted: string; // Human-readable amount (e.g., "10.5")
    rewardAmountFormattedAccrued: string; // Human-readable amount (e.g., "381.111")
}


const STAKING_ABI = [
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
    },
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

class StakingService {

    public async stakeToken(token: string, stakeData: { amount: string }): Promise<void> {
        const driver = getDriver()
        const tokenService = new TokenService();
        const walletService = new WalletService(driver);
        try {
            const username: string = await tokenService.verifyAccessToken(token);
            const walletAddress: string = await walletService.getSmartWalletAddress(username);

            const amountInWei = parseEther(stakeData.amount).toString();
            console.log(`Converting ${stakeData.amount} tokens to wei: ${amountInWei}`);

            console.log("Setting allowance for staking contract...");
            await engine.erc20.setAllowance(CHAIN, FARMER_CREDIT_TOKEN, walletAddress, {
                spenderAddress: STAKING_ADDRESS,
                amount: amountInWei
            });
    
            console.log("Allowance set successfully, now staking tokens...");
    
            // Call the stakeTokens function on the staking contract
            await engine.contract.write(CHAIN, STAKING_ADDRESS, walletAddress, {
                functionName: "stake(uint256)",
                args: [amountInWei],
                abi: STAKING_ABI,
            });

        } catch (error: any) {
            console.error("Error staking tokens:", error);
            throw new Error("Failed to stake tokens");
        }
    }


    public async getStakeInfo(token: string): Promise<StakeInfo> {
        const driver = getDriver()
        const tokenService = new TokenService();
        const walletService = new WalletService(driver);
        try {
            const username: string = await tokenService.verifyAccessToken(token);
            const walletAddress: string = await walletService.getSmartWalletAddress(username);
            const stakeInfo = await (await engine.contract.read(
                "getStakeInfo", 
                CHAIN, STAKING_ADDRESS, 
                walletAddress, 
                STAKING_ABI)).result as string[]

            const [stakeAmount, rewardAmountAccrued] = stakeInfo;

            // Parse the wei amounts to human-readable format (assuming 18 decimals)
            const stakeAmountFormatted = formatEther(stakeAmount);
            const rewardAmountFormattedAccrued = formatEther(rewardAmountAccrued);

            return { 
                stakeAmount, 
                rewardAmountAccrued,
                stakeAmountFormatted,
                rewardAmountFormattedAccrued
            };
        } catch (error) {
            console.error("Error getting stake information:", error);
            throw new Error(`Failed to get stake information: ${error}`);
        }
    }


     




}

export default StakingService