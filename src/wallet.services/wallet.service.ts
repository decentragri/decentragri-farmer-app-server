//** THIRDWEB IMPORT * TYPES
import { Engine } from "@thirdweb-dev/engine";

//** CONFIG IMPORT
import { ENGINE_ACCESS_TOKEN, ENGINE_URI, CHAIN, DECENTRAGRI_TOKEN, RSWETH_ADDRESS } from "../utils/constants";

//**  TYPE INTERFACE
import { type WalletData } from "./wallet.interface";

//** MEMGRAPH IMPORTS
import type { QueryResult } from "neo4j-driver";
import { Driver, Session } from "neo4j-driver-core";
import { InsightService } from "../insight.services/insight";



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

}

export default WalletService;

