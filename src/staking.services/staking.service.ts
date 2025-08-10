//** CONFIG IMPORTS */
import { getDriver } from "../db/memgraph";
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import TokenService from "../security.services/token.service";
import { STAKING_ABI } from "../utils/abi";
import { CHAIN, FARMER_CREDIT_TOKEN, STAKING_ADDRESS } from "../utils/constants";

//** ENGINE IMPORT */
import WalletService, { engine } from "../wallet.services/wallet.service";

//** ETHERS IMPORT */
import { parseEther, formatEther } from "ethers";

//** INTERFACE IMPORT */
import type { StakeInfo, StakerInfo } from "./staking.interface";


class StakingService {

    public async stakeToken(token: string, stakeData: { amount: string }): Promise<void> {
        const driver = getDriver()
        const tokenService = new TokenService();
        const walletService = new WalletService(driver);
        try {
            const username: string = await tokenService.verifyAccessToken(token);
            const walletAddress: string = await walletService.getSmartWalletAddress(username);

            const amountInWei = parseEther(stakeData.amount).toString();

            await engine.erc20.setAllowance(CHAIN, FARMER_CREDIT_TOKEN, walletAddress, {
                spenderAddress: STAKING_ADDRESS,
                amount: amountInWei
            });
    
            console.log("Allowance set successfully, now staking tokens...");
    
            // Call the stakeTokens function on the staking contract
            await engine.contract.write(CHAIN, STAKING_ADDRESS, walletAddress, {
                functionName: "stake(uint256 amount)",
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

            //18 decimals
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

    public async claimRewards(token: string): Promise<void> {
        const driver = getDriver()
        const tokenService = new TokenService();
        const walletService = new WalletService(driver);
        try {
            const username: string = await tokenService.verifyAccessToken(token);
            const walletAddress: string = await walletService.getSmartWalletAddress(username);

            // Call the claimRewards function on the staking contract
            await engine.contract.write(CHAIN, STAKING_ADDRESS, walletAddress, {
                functionName: "claimRewards()",
                args: [],
                abi: STAKING_ABI,
            });

        } catch (error: any) {
            console.error("Error claiming rewards:", error);
            throw new Error("Failed to claim rewards");
        }
    }

    public async withdraw(token: string, stakeData:  { amount: string}): Promise<SuccessMessage> {
        const driver = getDriver()
        const tokenService = new TokenService();
        try {
            const username: string = await tokenService.verifyAccessToken(token);
            const walletService = new WalletService(driver);
            const walletAddress: string = await walletService.getSmartWalletAddress(username);

            const amountInWei = parseEther(stakeData.amount).toString();

            // Call the withdraw function on the staking contract
            await engine.contract.write(CHAIN, STAKING_ADDRESS, walletAddress, {
                functionName: "withdraw(uint256)",
                args: [amountInWei],
                abi: STAKING_ABI,
            });


            return { success: `Successfully withdrew ${stakeData.amount} tokens`};

        } catch(error: any) {
            console.error("Error withdrawing tokens:", error);
            throw new Error("Failed to withdraw tokens");
        }
    }


    public async getStakers(token: string): Promise<StakerInfo> {
        const driver = getDriver()
        const tokenService = new TokenService();
        const walletService = new WalletService(driver);
        try {
            const username: string = await tokenService.verifyAccessToken(token);
            const walletAddress: string = await walletService.getSmartWalletAddress(username);
            
            // Call the stakers function with the wallet address as parameter
            const stakerData = await (await engine.contract.read(
                "stakers", 
                CHAIN, STAKING_ADDRESS, 
                walletAddress, 
                STAKING_ABI)).result as string[]

            const [timeOfLastUpdate, conditionIdOflastUpdate, amountStaked, unclaimedRewards] = stakerData;

            // Format amounts from wei to human-readable (18 decimals)
            const amountStakedFormatted = formatEther(amountStaked);
            const unclaimedRewardsFormatted = formatEther(unclaimedRewards);

            return { 
                timeOfLastUpdate,
                conditionIdOflastUpdate,
                amountStaked, 
                unclaimedRewards,
                amountStakedFormatted,
                unclaimedRewardsFormatted
            };
        } catch (error) {
            console.error("Error getting staker information:", error);
            throw new Error(`Failed to get staker information: ${error}`);
        }
    }
    // public async withdrawRewardTokens(token: string, amount: string): Promise<SuccessMessage> {
    //     const driver = getDriver()
    //     const tokenService = new TokenService();
    //     const walletService = new WalletService(driver);
    //     try {
    //         const username: string = await tokenService.verifyAccessToken(token);
    //         const walletAddress: string = await walletService.getSmartWalletAddress(username);

    //         const amountInWei = parseEther(amount).toString();

    //         // Call the withdrawRewardTokens function on the staking contract
    //         await engine.contract.write(CHAIN, STAKING_ADDRESS, walletAddress, {
    //             functionName: "withdrawRewardTokens(uint256 amount)",
    //             args: [amountInWei],
    //             abi: STAKING_ABI,
    //         });

    //         return { success: `Successfully withdrew reward tokens` };

    //     } catch (error: any) {
    //         console.error("Error withdrawing reward tokens:", error);
    //         throw new Error("Failed to withdraw reward tokens");
    //     }
    // }

}

export default StakingService