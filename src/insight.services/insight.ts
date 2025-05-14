// src/utils/pricing.ts
import TokenService from "../security.services/token.service";
import { SECRET_KEY } from "../utils/constants";
import type { WalletTransactionResponse } from "./insight.interface";

const headers = {
	"X-Secret-Key": SECRET_KEY,
};

export class InsightService {


	public async getTokenPriceUSD(chainId: number, tokenAddress: string = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"): Promise<number> {
		const url: string = `https://${chainId}.insight.thirdweb.com/v1/tokens/price?address=${tokenAddress}`;

		try {
			const res = await fetch(url, {
				headers
			});

			const json = await res.json();
			const price = json?.data?.[0]?.price_usd;
            

			if (!price) throw new Error("Price data not found");
			return price;
		} catch (err: any) {
			console.error(`Failed to fetch price for ${tokenAddress} on chain ${chainId}:`, err);
            throw new Error("Failed to fetch token price");
		}
	}

	public async getLastTransactions(walletAddress: string, chainId: string, token: string): Promise<WalletTransactionResponse> {
		const tokenService = new TokenService();
		await tokenService.verifyAccessToken(token);

		const idChain: number =parseInt(chainId);

		const url = `https://${idChain}.insight.thirdweb.com/v1/wallets/${walletAddress}/transactions?limit=10&sort_order=desc`;
		try {
			const res = await fetch(url, { 
				headers 
			});
			const json = await res.json();

			if (!json?.data) throw new Error("Transaction data not found");
			return json.data;
		} catch (err: any) {
			console.error(`Failed to fetch transactions for wallet ${walletAddress}:`, err);
			throw new Error("Failed to fetch wallet transactions");
		}
	}






}
