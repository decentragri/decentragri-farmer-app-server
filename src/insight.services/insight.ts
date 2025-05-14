// src/utils/pricing.ts
import { SECRET_KEY } from "../utils/constants";

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




	

}
