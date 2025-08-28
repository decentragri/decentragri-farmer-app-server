//** THIRDWEB IMPORT * TYPES
import { Engine } from "@thirdweb-dev/engine";

//** CONFIG IMPORT
import { ENGINE_ACCESS_TOKEN, ENGINE_URI, CHAIN, DECENTRAGRI_TOKEN, RSWETH_ADDRESS, ENGINE_ADMIN_WALLET_ADDRESS, FARMER_CREDIT_TOKEN } from "../utils/constants";

//**  TYPE INTERFACE
import { type TokenTransferData, type WalletData } from "./wallet.interface";

//** MEMGRAPH IMPORTS
import type { QueryResult } from "neo4j-driver";
import { Driver, Session } from "neo4j-driver-core";
import { InsightService } from "../insight.services/insight";
import TokenService from "../security.services/token.service";
import { NotificationService } from "../notification.services/notification.service";
import { NotificationType } from "../notification.services/notification.interface";



export const engine: Engine = new Engine({
  url: "https://engine.decentragri.com",
  accessToken: ENGINE_ACCESS_TOKEN,
  
});

class WalletService {
  driver?: Driver;
  constructor(driver?: Driver) {
    this.driver = driver;
  }



  /**
   * Creates a new backend wallet for the specified user.
   *
   * @param username - The username to use as the wallet label.
   * @returns A promise that resolves to the newly created wallet's address.
   * @throws Will throw an error if wallet creation fails.
   */
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


  /**
   * Retrieves the wallet balances and token prices for a given wallet address.
   *
   * This method fetches balances for ETH, SWELL, DecentrAgri (DAGRI), and rsWETH tokens,
   * as well as their respective USD prices. It handles errors gracefully by returning a price of 0
   * if fetching the price fails for any token.
   *
   * @param walletAddress - The address of the wallet to retrieve balances for.
   * @returns A promise that resolves to a `WalletData` object containing the wallet's balances and token prices.
   * @throws Will throw an error if fetching wallet balances or prices fails.
   */
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
     
        dagriToken,
   
        farmerCreditToken,
        dagriPrice,
        ethPrice,
        // swellPrice
      ] = await Promise.all([
        engine.backendWallet.getBalance("8453", walletAddress),
        // engine.backendWallet.getBalance(CHAIN, walletAddress),
        engine.erc20.balanceOf(walletAddress, CHAIN, DECENTRAGRI_TOKEN),
        // engine.erc20.balanceOf(walletAddress, "1", RSWETH_ADDRESS),
        engine.erc20.balanceOf(walletAddress, CHAIN, FARMER_CREDIT_TOKEN),
        safeGetPrice(parseInt(CHAIN), DECENTRAGRI_TOKEN), // may fallback to 0
        safeGetPrice(1), // ETH
        // safeGetPrice(1, "0x0a6E7Ba5042B38349e437ec6Db6214AEC7B35676") // SWELL
      ]);

      return {
        smartWalletAddress: walletAddress,
        // Balances
        ethBalance: ethToken.result.displayValue,
        // swellBalance: swellToken.result.displayValue,
        // rsWETHBalance: rsWETH.result.displayValue,
        swellBalance: "0", // Commented out - not currently necessary
        rsWETHBalance: "0", // Commented out - not currently necessary
        farmerCreditTokenBalance: farmerCreditToken.result.displayValue,
        dagriBalance: dagriToken.result.displayValue,
        // nativeBalance: swellToken.result.displayValue,
        nativeBalance: "0", // Commented out - not currently necessary

        // Prices
        dagriPriceUSD: dagriPrice,
        ethPriceUSD: ethPrice,
        // swellPriceUSD: swellPrice
        swellPriceUSD: 0 // Commented out - not currently necessary
      };
    } catch (error: any) {
      console.error("Error fetching wallet balance and prices:", error);
      throw new Error("Failed to fetch wallet balance data.");
    }
  }


  /**
   * Retrieves the smart wallet address associated with a given username.
   *
   * This method queries the database for a user node matching the provided username
   * and returns the corresponding smart wallet address. If the user does not exist,
   * an error is thrown.
   *
   * @param userName - The username of the user whose smart wallet address is to be retrieved.
   * @returns A promise that resolves to the smart wallet address as a string.
   * @throws Will throw an error if the user with the specified username is not found or if a database error occurs.
   */
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

  /**
   * Retrieves the username associated with a given wallet address.
   *
   * @param walletAddress - The wallet address to look up.
   * @returns A promise that resolves to the username or null if not found.
   */
  public async getUsernameByWalletAddress(walletAddress: string): Promise<string | null> {
    try {
        const session: Session | undefined = this.driver?.session();
        
        // Find the user node by wallet address
        const result: QueryResult | undefined = await session?.executeRead(tx =>
            tx.run('MATCH (u:User {walletAddress: $walletAddress}) RETURN u.username AS username', { walletAddress })
        );

        await session?.close();
        
        // Return username if found, null otherwise
        if (result?.records.length === 0) {
            return null;
        }

        return result?.records[0].get('username');
    } catch (error: any) {
        console.log('Error finding username by wallet address:', error);
        return null;
    }
  }


  /**
   * Transfers a token (either native ETH or ERC-20) from the user's smart wallet to a specified receiver.
   *
   * - For native ETH transfers, sends the specified amount directly without requiring allowance.
   * - For ERC-20 token transfers, sets the necessary allowance before transferring the token.
   * - Waits for each transaction (allowance and transfer) to be mined before proceeding.
   *
   * @param token - The access token used to authenticate and identify the user.
   * @param tokenTransferData - An object containing the receiver's address, token name, and amount to transfer.
   * @returns A promise that resolves to an object indicating the success of the transfer.
   * @throws Will throw an error if the transfer fails at any step.
   */

  public async transferToken(token: string, tokenTransferData: TokenTransferData): Promise<{ success: string }> {
    const tokenService = new TokenService();
    const username: string = await tokenService.verifyAccessToken(token);
    const smartWalletAddress: string = await this.getSmartWalletAddress(username);
    const { receiver, tokenName, amount } = tokenTransferData;
    const { chainId, contractAddress } = await this.getTokenChainAndAddress(tokenName);
    const notificationService = NotificationService.getInstance();

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

        console.log("address: ", smartWalletAddress)
        // Case: ERC-20 token transfer (with allowance)
        const allowanceTx = await engine.erc20.setAllowance(chainId, contractAddress, smartWalletAddress,
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

      // Send notification to sender
      const receiverUsername = await this.getUsernameByWalletAddress(receiver);
      const receiverDisplay = receiverUsername || `...${receiver.slice(-4)}`;
      
      await notificationService.createNotification({
        userId: username,
        type: NotificationType.TOKEN_TRANSFER,
        title: "Token Transfer Successful",
        message: `You have successfully transferred ${amount} ${tokenName} to ${receiverDisplay}.`,
        metadata: { amount, tokenName, receiver, receiverUsername }
      });

      // Send notification to receiver (only if receiver is a registered user)
      if (receiverUsername) {
        await notificationService.createNotification({
          userId: receiverUsername,
          type: NotificationType.TOKEN_TRANSFER,
          title: "Token Received",
          message: `You have received ${amount} ${tokenName} from ${username}.`,
          metadata: { amount, tokenName, sender: username, senderWallet: smartWalletAddress }
        });
      } else {
        console.log(`Receiver ${receiver} is not a registered user - notification sent with address ${receiverDisplay}`);
      }

      return { success: "Token transferred successfully." };
    } catch (error: any) {
      console.error("Error transferring token:", error);
      throw new Error("Failed to transfer token.");
    }
  }


  /**
   * Retrieves the blockchain chain ID and contract address for a given token name.
   *
   * @param tokenName - The name of the token (e.g., "ETH", "SWELL", "RSWETH", "DAGRI").
   * @returns A promise that resolves to an object containing the `chainId` and `contractAddress` for the specified token.
   * @throws Will throw an error if the token name is unrecognized or if there is a failure in retrieving the information.
   */
	public async getTokenChainAndAddress(tokenName: string): Promise<{ chainId: string; contractAddress: string }> {
		try {
			let chainId: string;
			let contractAddress: string;

			switch (tokenName.toUpperCase()) {
				case "ETH":
					chainId = CHAIN;
					contractAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"; // Native ETH representation
					break;

				case "DAGRI":
					chainId = CHAIN;
					contractAddress = DECENTRAGRI_TOKEN;
					break;
        case "FDAGRI":
					chainId = CHAIN;
					contractAddress = FARMER_CREDIT_TOKEN;
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


  /**
   * Ensures that a transaction with the specified `queueId` is mined by polling its status,
   * handling errors, and retrying as necessary. The method performs a limited number of immediate
   * retries for both normal and errored states, logging status changes and progress at configurable intervals.
   * If the transaction is not mined within the allowed retries, it moves the monitoring process to the background.
   *
   * @param queueId - The unique identifier for the transaction to monitor.
   * @returns A promise that resolves when the transaction is successfully mined, cancelled, or background monitoring is initiated.
   *
   * @remarks
   * - Logs status changes and progress to the console.
   * - Handles "errored" and "cancelled" transaction states with specific logic.
   * - Initiates background monitoring if the transaction is not mined within the maximum retries.
   * - Retries are performed synchronously for errored transactions.
   */
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


  /**
   * Retries a transaction in the background until it is mined, cancelled, or the maximum number of retries is reached.
   *
   * This method periodically checks the status of a transaction identified by `queueId`.
   * - If the transaction is mined, it logs a success message and stops retrying.
   * - If the transaction has errored, it attempts to retry and synchronize the transaction, logging a warning.
   * - If the transaction is cancelled, it logs an error and stops retrying.
   * - If a network error occurs, it logs a warning and continues retrying.
   * The retry process runs in the background and will attempt up to 100 retries, waiting 5 seconds between each attempt.
   *
   * @param queueId - The unique identifier of the transaction to monitor and retry.
   */
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

