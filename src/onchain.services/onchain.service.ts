//** SERVICE IMPORT */
import { InsightService } from "../utils/insight";

//** TYPE IMPORTS */
import type { ETHAndRSWETHPrice, SuccessMessage } from "./onchain.interface";

//** CONFIG IMPORTS */
import { RSWETH_ADDRESS, SECRET_KEY } from "../utils/constants";
import TokenService from "../security.services/token.service";

//** ENGINE IMPORT */
import WalletService, { engine } from "../wallet.services/wallet.service";
import { RSWETH_ABI } from "../utils/abi";
import { parseEther } from "ethers";
import { getDriver } from "../db/memgraph";

export interface ETHAndRSWETHRate {
	ethToRswETHRate: number;
	rate: number;
}

export interface RSWETHToEthRate {
	rswETHToEthRate: number;
	rate: number;
}


class OnChainService {
	public async getETHandSWETHPrice(token: string): Promise<ETHAndRSWETHPrice> {
		const tokenService = new TokenService();
		const insightService = new InsightService(SECRET_KEY);
		try {
			await tokenService.verifyRefreshToken(token);
			const ETHPrice: number = await insightService.getTokenPriceUSD(1);
			const rswETHPrice: number = await insightService.getTokenPriceUSD(1, RSWETH_ADDRESS);

			if (!ETHPrice || !rswETHPrice) {
				throw new Error("Invalid token price data");
			}

			const exchangeRate = ETHPrice / rswETHPrice; // 1 ETH = X RSWETH

			return { ETHPrice, rswETHPrice, exchangeRate };
		} catch (err) {
			console.error(`Failed to fetch ETH or RSWETH price:`, err);
			throw new Error("Failed to fetch ETH and RSWETH prices");
		}
	}

	public async ethToRswETHRate(token: string): Promise<ETHAndRSWETHRate> {
		const tokenService = new TokenService();
	
		try {
			await tokenService.verifyAccessToken(token);
	
			const [rateRaw, ethToRswETHRaw] = await Promise.all([
				this.getRate(token),
				engine.contract.read("ethToRswETHRate", "1", RSWETH_ADDRESS, undefined, RSWETH_ABI),
			]);
	
			const ethToRswETHRate: number = ethToRswETHRaw.result / 1e18;
			const rate: number = rateRaw / 1e18;
	
			return { ethToRswETHRate, rate };
		} catch (error: any) {
			console.error(`Failed to fetch ETH to RSWETH rate:`, error);
			return { ethToRswETHRate: 0, rate: 0 }; // fallback
		}
	}
	
	

	public async rswETHToEthRate(token: string): Promise<RSWETHToEthRate> {
		const tokenService = new TokenService();
		try {
			await tokenService.verifyAccessToken(token);

			const [rate, rswETHToEthRaw] = await Promise.all([
				this.getRate(token),
				(await engine.contract.read("rswETHToEthRate" , "1", RSWETH_ADDRESS, undefined, RSWETH_ABI))
			]);

			const rswETHToEthRate: number = rswETHToEthRaw.result / 1e18;

			return { rate, rswETHToEthRate };
		} catch (error: any) {
			console.error(`Failed to fetch RSWETH to ETH rate:`, error);
			throw new Error("Failed to fetch RSWETH to ETH rate");
		}
	}

	public async getRate(token: string): Promise<number> {
		const tokenService = new TokenService();
		try {
			await tokenService.verifyAccessToken(token);
			const rate: number =  (await engine.contract.read("getRate" , "1", RSWETH_ADDRESS, undefined, RSWETH_ABI)).result;
			const rateValue: number = Number(rate)
			
			return rateValue;
		} catch (error: any) {
			console.error(`Failed to fetch rates:`, error);
			throw new Error("Failed to fetch rates");
		}
	}

	public async swellTreasuryRewardPercentage(token: string) {
		const tokenService = new TokenService();
		try {
			await tokenService.verifyAccessToken(token);
			const rate: number = (await engine.contract.read("swellTreasuryRewardPercentage" , "1", RSWETH_ADDRESS, undefined, RSWETH_ABI)).result;

			return { rewardRate: rate };
		} catch (error: any) {
			console.error(`Failed to fetch rates:`, error);
			throw new Error("Failed to fetch rates");
		}
	}

	public async stakeETH(token: string, stakingData: { ethAmount: string }): Promise<SuccessMessage> {
		const tokenService = new TokenService();
		const driver = getDriver();
		const walletService = new WalletService(driver);
		const username = await tokenService.verifyAccessToken(token);
	
		try {
			const smartWalletAddress: string = await walletService.getSmartWalletAddress(username);
			const amountInWei: string = parseEther(stakingData.ethAmount).toString();

			
			const result = await engine.contract.write("1", RSWETH_ADDRESS, smartWalletAddress,
				{
					// Full function signature helps avoid ambiguity
					functionName: "function deposit()",
					args: [],
					txOverrides: {
						value: amountInWei,
					},
					abi: RSWETH_ABI,
				}
			);

			await this.ensureTransactionMined(result.result.queueId);
	
			return { success : "Staking Success: " + result.result.queueId };
		} catch (error: any) {
			console.error("Failed to stake ETH for rswETH:", error);
			throw new Error("Staking transaction failed");
		}
	}

	public async ensureTransactionMined(queueId: string): Promise<void> {
		const maxImmediateRetries = 3; // Number of direct retries before restarting the transaction
		const retryInterval = 3000; // 3 seconds delay
		let retries = 0;
		let errorRetries = 0;
		let lastStatus = "";
	  
		while (retries < maxImmediateRetries) {
		  try {
			const status = await engine.transaction.status(queueId);
	  
			if (status.result.status !== lastStatus) {
			  console.log(`🔄 Transaction ${queueId} status: ${status.result.status}`);
			  lastStatus = status.result.status;
			}
	  
			if (status.result.status === "mined") {
			  console.log(`✅ Transaction ${queueId} successfully mined.`);
			  return;
			}
	  
			if (status.result.status === "errored") {
			  if (errorRetries >= 5) {
				console.error(`🚨 Transaction ${queueId} failed after max retries. Restarting transaction...`);
				throw new Error("Transaction failed, restarting process.");
			  }
	  
			  console.warn(`⚠️ Transaction ${queueId} errored. Retrying... (${errorRetries + 1}/5)`);
			  await engine.transaction.retryFailed({ queueId });
			  await engine.transaction.syncRetry({ queueId });
			  errorRetries++;
			}
	  
			if (status.result.status === "cancelled") {
			  throw new Error(`🚨 Transaction ${queueId} was cancelled.`);
			}
	  
			await new Promise((resolve) => setTimeout(resolve, retryInterval));
		  } catch (networkError) {
			console.warn(`⚠️ Network error for transaction ${queueId}, retrying...`, networkError);
		  }
	  
		  retries++;
		}
	  
		console.warn(`⚠️ Moving transaction ${queueId} to background monitoring...`);

	  }
	
}



export default OnChainService;
