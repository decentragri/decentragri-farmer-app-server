//** CONFIG IMPORTS */
import { getDriver } from "../db/memgraph";
import type { SuccessMessage } from "../onchain.services/onchain.interface";
import TokenService from "../security.services/token.service";
import { STAKE_ABI, GET_STAKE_INFO_ABI, STAKERS_ABI, CLAIM_REWARDS_ABI, WITHDRAW_ABI, GET_TIME_UNIT_ABI } from "../utils/staking-abi-fragments";
import { CHAIN, FARMER_CREDIT_TOKEN, STAKING_ADDRESS } from "../utils/constants";

//** ENGINE IMPORT */
import WalletService, { engine } from "../wallet.services/wallet.service";

//** ETHERS IMPORT */
import { parseEther, formatEther } from "ethers";

//** INTERFACE IMPORT */
import type { StakeInfo, StakerInfo, ReleaseTimeFrame } from "./staking.interface";


class StakingService {

    public async stakeToken(token: string, stakeData: { amount: string }): Promise<SuccessMessage> {
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
            const tx = await engine.contract.write(CHAIN, STAKING_ADDRESS, walletAddress, {
                functionName: "stake(uint256 amount)",
                args: [amountInWei],
                abi: STAKE_ABI,
            });


            

            await walletService.ensureTransactionMined(tx.result.queueId);
            const txResult = (await engine.transaction.status(tx.result.queueId)).result;
            if (txResult.status === "mined") {
                return { success: "Tokens staked successfully" };
            }

            return { error: "Failed to stake tokens" };

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
                GET_STAKE_INFO_ABI)).result as string[]

            const [stakeAmount, rewardAmountAccrued] = stakeInfo;

            //18 decimals
            const stakeAmountFormatted = formatEther(stakeAmount);
            const rewardAmountFormattedAccrued = formatEther(rewardAmountAccrued);

            // Get release time frame information
            const releaseTimeFrame = await this.getReleaseTimeFrame(token);

            return { 
                stakeAmount, 
                rewardAmountAccrued,
                stakeAmountFormatted,
                rewardAmountFormattedAccrued,
                releaseTimeFrame
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
                abi: CLAIM_REWARDS_ABI,
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
                abi: WITHDRAW_ABI,
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
                STAKERS_ABI)).result as string[]

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

    public async getReleaseTimeFrame(token: string): Promise<ReleaseTimeFrame> {
        const driver = getDriver()
        const tokenService = new TokenService();
        const walletService = new WalletService(driver);
        try {
            const username: string = await tokenService.verifyAccessToken(token);
            const walletAddress: string = await walletService.getSmartWalletAddress(username);
            
            // Call the getTimeUnit function (no parameters needed)
            const timeUnitData = await (await engine.contract.read(
                "getTimeUnit", 
                CHAIN, STAKING_ADDRESS, 
                "", 
                GET_TIME_UNIT_ABI)).result as string;

            const timeUnit = timeUnitData;

            // Format time unit to human-readable format
            const timeUnitSeconds = parseInt(timeUnit);
            let timeUnitFormatted = `${timeUnitSeconds} seconds`;
            
            // Add more readable format with proper calculations
            if (timeUnitSeconds >= 86400) {
                const days = Math.floor(timeUnitSeconds / 86400);
                const remainingHours = Math.floor((timeUnitSeconds % 86400) / 3600);
                if (remainingHours > 0) {
                    timeUnitFormatted += ` (${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''})`;
                } else {
                    timeUnitFormatted += ` (${days} day${days > 1 ? 's' : ''})`;
                }
            } else if (timeUnitSeconds >= 3600) {
                const hours = Math.floor(timeUnitSeconds / 3600);
                const remainingMinutes = Math.floor((timeUnitSeconds % 3600) / 60);
                if (remainingMinutes > 0) {
                    timeUnitFormatted += ` (${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''})`;
                } else {
                    timeUnitFormatted += ` (${hours} hour${hours > 1 ? 's' : ''})`;
                }
            } else if (timeUnitSeconds >= 60) {
                const minutes = Math.floor(timeUnitSeconds / 60);
                const remainingSeconds = timeUnitSeconds % 60;
                if (remainingSeconds > 0) {
                    timeUnitFormatted += ` (${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''})`;
                } else {
                    timeUnitFormatted += ` (${minutes} minute${minutes > 1 ? 's' : ''})`;
                }
            }

            return { 
                timeUnit,
                timeUnitFormatted
            };
        } catch (error) {
            console.error("Error getting release time frame:", error);
            throw new Error(`Failed to get release time frame: ${error}`);
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