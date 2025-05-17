//** THIRDWEB IMPORT * TYPES
import { Engine } from "@thirdweb-dev/engine";

//** CONFIG IMPORT
import { ENGINE_ACCESS_TOKEN, ENGINE_URI, CHAIN, DECENTRAGRI_TOKEN, RSWETH_ADDRESS, ENGINE_ADMIN_WALLET_ADDRESS } from "../utils/constants";

//**  TYPE INTERFACE
import { type TokenTransferData, type WalletData } from "./wallet.interface";

//** MEMGRAPH IMPORTS
import type { QueryResult } from "neo4j-driver";
import { Driver, Session } from "neo4j-driver-core";
import { InsightService } from "../insight.services/insight";
import TokenService from "../security.services/token.service";



export const engine: Engine = new Engine({
  url: ENGINE_URI,
  accessToken: ENGINE_ACCESS_TOKEN,
  
});

class WalletService {
  driver?: Driver;
  constructor(driver?: Driver) {
    this.driver = driver;
  }


  //** Creates a wallet and returns the wallet address.
  public async createWallet(username: string): Promise<string> {
     try {
         // Create a new backend wallet with the player's username as the label
         const wallet = await engine.backendWallet.create({ label: username, type: "smart:local" });
         
         // Extract the wallet address from the response
         const { walletAddress } = wallet.result;

         return walletAddress;
     } catch (error: any) {
         console.error("Error creating player wallet:", error);
         throw error;
     }
  }


  public async getWalletBalance(walletAddress: string): Promise<WalletData> {
    const insightService = new InsightService();

    // Helper function to get token price safely
    const safeGetPrice = async (chainId: number, address?: string): Promise<number> => {
      try {
        return await insightService.getTokenPriceUSD(chainId, address);
      } catch {
        return 0;
      }
    };

    try {
      const [
        ethToken,
        swellToken,
        dagriToken,
        rsWETH,
        dagriPrice,
        ethPrice,
        swellPrice
      ] = await Promise.all([
        engine.backendWallet.getBalance("1", walletAddress),
        engine.backendWallet.getBalance(CHAIN, walletAddress),
        engine.erc20.balanceOf(walletAddress, CHAIN, DECENTRAGRI_TOKEN),
        engine.erc20.balanceOf(walletAddress, "1", RSWETH_ADDRESS),
        safeGetPrice(parseInt(CHAIN), DECENTRAGRI_TOKEN), // may fallback to 0
        safeGetPrice(1), // ETH
        safeGetPrice(1, "0x0a6E7Ba5042B38349e437ec6Db6214AEC7B35676") // SWELL
      ]);

      return {
        smartWalletAddress: walletAddress,

        // Balances
        ethBalance: ethToken.result.displayValue,
        swellBalance: swellToken.result.displayValue,
        rsWETHBalance: rsWETH.result.displayValue,
        dagriBalance: dagriToken.result.displayValue,
        nativeBalance: swellToken.result.displayValue,

        // Prices
        dagriPriceUSD: dagriPrice,
        ethPriceUSD: ethPrice,
        swellPriceUSD: swellPrice
      };
    } catch (error: any) {
      console.error("Error fetching wallet balance and prices:", error);
      throw new Error("Failed to fetch wallet balance data.");
    }
  }


  public async getSmartWalletAddress(userName: string): Promise<string> {
    try {
        const session: Session | undefined = this.driver?.session();
        
        // Find the user node within a Read Transaction
        const result: QueryResult | undefined = await session?.executeRead(tx =>
            tx.run('MATCH (u:User {username: $userName}) RETURN u.walletAddress AS smartWalletAddress', { userName })
        );

        await session?.close();
        
        // Verify the user exists
        if (result?.records.length === 0) {
            throw new Error(`User with username '${userName}' not found.`);
        }

        // Retrieve the smartWalletAddress
        const smartWalletAddress: string = result?.records[0].get('smartWalletAddress');
        
        return smartWalletAddress;
    } catch (error: any) {
        console.log(error);
        throw error;
    }
  }


  public async transferToken(token: string, tokenTransferData: TokenTransferData): Promise<{ success: string }> {
    const tokenService = new TokenService();
    const username: string = await tokenService.verifyAccessToken(token);
    const smartWalletAddress: string = await this.getSmartWalletAddress(username);
    const { receiver, tokenName, amount } = tokenTransferData;
    const { chainId, contractAddress } = await this.getTokenChainAndAddress(tokenName);

    try {
      // Case: Native ETH transfer (no allowance needed)
      if (
        contractAddress.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      ) {
        const nativeTransferTx = await engine.erc20.transferFrom(
          chainId,
          contractAddress,
          smartWalletAddress,
          {
            fromAddress: smartWalletAddress,
            toAddress: receiver,
            amount: "0", // Set to 0 for native ETH transfer
            // Use txOverrides to specify native ETH transfer
            txOverrides: {
              value: amount // Send native ETH value
            }
          }
        );
        await this.ensureTransactionMined(nativeTransferTx.result.queueId);
        console.log("Native ETH transaction mined:", nativeTransferTx.result.queueId);
      } else {
        // Case: ERC-20 token transfer (with allowance)
        const allowanceTx = await engine.erc20.setAllowance(
          chainId,
          contractAddress,
          smartWalletAddress,
          {
            spenderAddress: smartWalletAddress,
            amount
          }
        );
        await this.ensureTransactionMined(allowanceTx.result.queueId);
        console.log("Allowance transaction mined:", allowanceTx.result.queueId);

        const transferTx = await engine.erc20.transferFrom(
          chainId,
          contractAddress,
          smartWalletAddress,
          {
            fromAddress: smartWalletAddress,
            toAddress: receiver,
            amount
          }
        );
        await this.ensureTransactionMined(transferTx.result.queueId);
        console.log("ERC20 transfer transaction mined:", transferTx.result.queueId);
      }

      return { success: "Token transferred successfully." };
    } catch (error: any) {
      console.error("Error transferring token:", error);
      throw new Error("Failed to transfer token.");
    }
  }


	public async getTokenChainAndAddress(tokenName: string): Promise<{ chainId: string; contractAddress: string }> {
		try {
			let chainId: string;
			let contractAddress: string;

			switch (tokenName.toUpperCase()) {
				case "ETH":
					chainId = "1";
					contractAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"; // Native ETH representation
					break;

				case "SWELL":
					chainId = "1";
					contractAddress = "0x0a6E7Ba5042B38349e437ec6Db6214AEC7B35676"; // Replace with correct SWELL address if different
					break;

				case "RSWETH":
					chainId = "1";
					contractAddress = RSWETH_ADDRESS;
					break;

				case "DAGRI":
					chainId = CHAIN;
					contractAddress = DECENTRAGRI_TOKEN;
					break;

				default:
					throw new Error(`Unrecognized token name: ${tokenName}`);
			}

			return { chainId, contractAddress };
		} catch (error: any) {
			console.error("Error getting token chain and address:", error);
			throw new Error("Failed to get token chain and address.");
		}
	}













  public async ensureTransactionMined(queueId: string): Promise<void> {
		const maxRetries = 3; // Number of immediate retries before background retry
		const maxErrorRetries = 3; // Max retries for errored transactions
		const retryInterval = 5000; // 3 seconds delay between retries
		const logEvery = 3; // Log every N retries
	
		let retries = 0;
		let errorRetries = 0;
		let lastStatus = "";
	
		while (retries < maxRetries) {
			try {
				const status = await engine.transaction.status(queueId);
	
				// ✅ Log status changes only
				if (status.result.status !== lastStatus) {
					console.log(`🔄 Transaction ${queueId} status: ${status.result.status}`);
					lastStatus = status.result.status;
				}
	
				if (status.result.status === "mined") {
					console.log(`✅ Transaction ${queueId} successfully mined.`);
					return;
				}
	
				if (status.result.status === "errored") {
					if (errorRetries >= maxErrorRetries) {
						console.error(`🚨 Transaction ${queueId} failed after ${maxErrorRetries} attempts.`);
						break; // Stop retries and move to background mode
					}
	
					console.warn(`⚠️ Transaction ${queueId} errored. Retrying... (${errorRetries + 1}/${maxErrorRetries})`);
					await engine.transaction.retryFailed({ queueId });
					await engine.transaction.syncRetry({ queueId }); // 🔄 Ensures retry is synchronous
					errorRetries++;
				}
	
				if (status.result.status === "cancelled") {
					console.error(`🚨 Transaction ${queueId} was cancelled.`);
					return;
				}
	
				// ✅ Log every N retries
				if (retries % logEvery === 0) {
					console.log(`⏳ Still waiting for transaction ${queueId} to be mined...`);
				}
	
				// Wait before checking status again
				await new Promise((resolve) => setTimeout(resolve, retryInterval));
			} catch (networkError) {
				console.warn(`⚠️ Network error while checking transaction ${queueId}, retrying...`, networkError);
			}
	
			retries++;
		}
	
		// 🚀 Start background retries after maxRetries is reached
		console.warn(`⚠️ Moving transaction ${queueId} to background monitoring...`);
		this.retryInBackground(queueId);
	}


  private retryInBackground(queueId: string) {
		const retryInterval = 5000; // Retry every 5 seconds
		const maxBackgroundRetries = 100; // Give up after 100 background retries
	
		let retries = 0;
	
		const retryLoop = async () => {
			while (retries < maxBackgroundRetries) {
				try {
					const status = await engine.transaction.status(queueId);
	
					if (status.result.status === "mined") {
						console.log(`✅ (Background) Transaction ${queueId} successfully mined.`);
						return;
					}
	
					if (status.result.status === "errored") {
						console.warn(`⚠️ (Background) Retrying errored transaction ${queueId}... (${retries + 1}/${maxBackgroundRetries})`);
						await engine.transaction.retryFailed({ queueId });
						await engine.transaction.syncRetry({ queueId });
					}
	
					if (status.result.status === "cancelled") {
						console.error(`🚨 (Background) Transaction ${queueId} was cancelled.`);
						return;
					}
	
					// Wait before the next retry
					await new Promise((resolve) => setTimeout(resolve, retryInterval));
				} catch (networkError) {
					console.warn(`⚠️ (Background) Network error for transaction ${queueId}, retrying...`, networkError);
				}
	
				retries++;
			}
	
			console.error(`🚨 (Background) Transaction ${queueId} did not succeed after ${maxBackgroundRetries} retries.`);
		};
	
		// Run the retry loop in the background
		retryLoop();
	}


}
export default WalletService;

