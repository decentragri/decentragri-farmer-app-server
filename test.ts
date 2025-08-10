import { createServerWallet } from "thirdweb/engine";
import { CHAIN, CLIENT_ID, DECENTRAGRI_TOKEN, ENGINE_ADMIN_WALLET_ADDRESS, FARMER_CREDIT_TOKEN, SECRET_KEY, STAKING_ADDRESS, WEATHER_API_KEY } from "./src/utils/constants";
import { createThirdwebClient, Engine, getContract } from "thirdweb"
import { mintTo } from "thirdweb/extensions/erc1155";
import type { PlantImageScanParams } from "./src/ai.services/plant.ai.team.service/plant.interface";
import { arbitrumSepolia } from "thirdweb/chains";

import { engine } from "./src/wallet.services/wallet.service";
import { parseEther } from "ethers";

// Import specific ABI fragments
import { 
    DEPOSIT_REWARD_TOKENS_ABI, 
    STAKE_ABI, 
    GET_REWARD_TOKEN_BALANCE_ABI, 
    GET_STAKE_INFO_ABI, 
    STAKERS_ABI, 
    GET_TIME_UNIT_ABI 
} from "./src/utils/staking-abi-fragments";

export const getCurrentWeather = async (lat: number, lng: number): Promise<any> => {
        const url: string = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch weather: ${response.statusText}`);
        }
        return await response.json();
    };

const originalFetch = globalThis.fetch;

//@ts-ignore
globalThis.fetch = async (input, init) => {
    console.log("\n🔍 FETCH DEBUG");
    console.log("➡️ Request URL:", input);
    console.log("➡️ Request Method:", init?.method);
    console.log("➡️ Request Headers:", init?.headers);
    console.log("➡️ Request Body:", init?.body ? await streamToString(init.body) : null);

    const response = await originalFetch(input, init);

    const cloned = response.clone();
    const bodyText = await cloned.text();
    console.log("⬅️ Response Status:", cloned.status);
    console.log("⬅️ Response Body:", bodyText);

    return response;
};


const client = createThirdwebClient({
    secretKey: SECRET_KEY,
    clientId: CLIENT_ID
})


async function streamToString(body: any) {
	if (typeof body === "string") return body;
	if (body instanceof ReadableStream) {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let result = "", done, value;
		while (!done) {
			({ done, value } = await reader.read());
			if (value) result += decoder.decode(value);
		}
		return result;
	}
	return "[unknown body type]";
}



// const result = await createServerWallet({
//     client,
//     label: "Server Wallet",
// })  



// console.log(result)






const savePlantScanToNFT = async (data: PlantImageScanParams,image: string | number[]): Promise<void> => {
    const serverWallet = Engine.serverWallet({
        client,
        address: "0x03934397d7146f1cD19B705E248e58307D1b7a08",
        vaultAccessToken: process.env.VAULT_ACCESS_TOKEN!,
    });

    let imageFile: File;
    
    if (Array.isArray(image)) {
        // Handle case when image is already a byte array
        const buffer = Buffer.from(image);
        imageFile = new File([buffer], "plant-scan.png", {
            type: "image/png",
        });
    } else if (image.startsWith('http')) {
        // Handle case when image is a URL
        const response = await fetch(image);
        const blob = await response.blob();
        imageFile = new File([blob], "plant-scan.png", { type: blob.type });
    } else {
        // Handle case when image is a base64 string or other format
        try {
            const byteArray = JSON.parse(image);
            const buffer = Buffer.from(byteArray);
            imageFile = new File([buffer], "plant-scan.png", {
                type: "image/png",
            });
        } catch (e) {
            throw new Error("Invalid image format. Expected URL, byte RETURN array, or JSON string of bytes.");
        }
    }
    
    const contract = getContract({
        client,
        address: "0x03934397d7146f1cD19B705E248e58307D1b7a08",
        chain: arbitrumSepolia,
    });

    const attributes = [
        {
            trait_type: "AI Evaluation",
            value: data.interpretation,
        },
        {
            trait_type: "Crop Type",
            value: data.cropType,
        },
    ];

    const metadata = {
        name: "Plant Health NFT",
        description: "Visual health check of crop using AI analysis.",
        image: imageFile,
        external_url: "https://decentragri.com/plant-scans",
        background_color: "#E0FFE0",
        properties: {
            image: "Uploaded via buffer", // fallback text
            cropType: data.cropType,
            timestamp: new Date().toISOString(),
            note: data.note ?? "No additional notes",
            interpretation: data.interpretation,
        },
        attributes,
    };
    
    const transaction = mintTo({
        contract,
        to: "0x17dE000e4E342a74E77EDf6C94aC211099BE4862",
         // receiver smart wallet
        supply: 1n,
        nft: metadata,
    });

    try {
        const { transactionId } = await serverWallet.enqueueTransaction({
            transaction,
        });
        

    } catch (error) {
        console.error("Error minting plant scan NFT:", error);
        throw new Error("Failed to mint plant scan NFT");
    }
}

// savePlantScanToNFT({
//     farmName: "Farm 1",
//     cropType: "Tomato",
//     note: "No additional notes",
//     interpretation: "Healthy plant",
//     imageBytes: "https://d391b93f5f62d9c15f67142e43841acc.ipfscdn.io/ipfs/QmdRtWRHQwEkKA7nciqRQmgW7y6yygT589aogfUYaoc3Ea/ChatGPT%20Image%20Apr%2021%2C%202025%2C%2012_14_42%20PM.png"
// }, "https://example.com/image.jpg");



// Example usage (commented out to prevent execution during tests)
/*
// Example with URL
const exampleParams: PlantImageScanParams = {
    farmName: "Farm 1",
    cropType: "Tomato",
    note: "No additional notes",
    interpretation: "Healthy plant",
    imageBytes: "https://example.com/image.jpg"
};

// Uncomment to run the example with URL
// savePlantScanToNFT(exampleParams, exampleParams.imageBytes, "username");

// Example with byte array
const byteArrayExample: number[] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]; // Example PNG header
const byteArrayParams: PlantImageScanParams = {
    farmName: "Farm 1",
    cropType: "Tomato",
    note: "No additional notes",
    interpretation: "Healthy plant",
    imageBytes: "data:image/png;base64,..." // or any other placeholder
};

// Uncomment to run the example with byte array
// savePlantScanToNFT(byteArrayParams, byteArrayExample, "username");
*/






const depositRewardTokens = async (amount: string): Promise<{ result: { queueId: string } }> => {
    try {
        // Convert amount to proper token units (assuming 18 decimals for DECENTRAGRI_TOKEN)
        const amountInWei = parseEther(amount).toString();
        console.log(`Converting ${amount} tokens to wei: ${amountInWei}`);


        // First, set allowance for the staking contract to spend tokens
        console.log("Setting allowance for staking contract...");
        await engine.erc20.setAllowance(CHAIN, DECENTRAGRI_TOKEN, ENGINE_ADMIN_WALLET_ADDRESS, {
            spenderAddress: STAKING_ADDRESS, 
            amount: amountInWei
        });

        console.log("Allowance set successfully, now depositing reward tokens...");

        // Call the depositRewardTokens function on the staking contract
        const result = await engine.contract.write(CHAIN, STAKING_ADDRESS, ENGINE_ADMIN_WALLET_ADDRESS, {
            functionName: "depositRewardTokens(uint256)",
            args: [amountInWei],
            abi: DEPOSIT_REWARD_TOKENS_ABI,
        });

        console.log("Deposit successful:", result);
        return result;

    } catch (error) {
        console.error("Error depositing reward tokens:", error);
        throw new Error(`Failed to deposit reward tokens: ${error}`);
    }
};



// await depositRewardTokens("10000000"); // Example amount - 10 million tokens





const stakeToken = async (amount: string): Promise<{ result: { queueId: string } }> => {
    try {
        // Convert amount to proper token units (assuming 18 decimals for DECENTRAGRI_TOKEN)
        const amountInWei = parseEther(amount).toString();
        console.log(`Converting ${amount} tokens to wei: ${amountInWei}`);


        // First, set allowance for the staking contract to spend tokens
        console.log("Setting allowance for staking contract...");
        await engine.erc20.setAllowance(CHAIN, FARMER_CREDIT_TOKEN, "0xa23A9a2b962d387E9816A4FE1959dFE1cb2EF50e", {
            spenderAddress: STAKING_ADDRESS,
            amount: amountInWei
        });

        console.log("Allowance set successfully, now staking tokens...");

        // Call the stakeTokens function on the staking contract
        const result = await engine.contract.write(CHAIN, STAKING_ADDRESS, "0xa23A9a2b962d387E9816A4FE1959dFE1cb2EF50e", {
            functionName: "stake(uint256)",
            args: [amountInWei],
            abi: STAKE_ABI,
        });

        console.log("Stake successful:", result);
        return result;

    } catch (error) {
        console.error("Error staking tokens:", error);
        throw new Error(`Failed to stake tokens: ${error}`);
    }
};

// Function to check all available reward information
// const checkRewardInfo = async (userAddress?: string): Promise<void> => {
//     try {
//         console.log("\n🔍 CHECKING REWARD INFORMATION...\n");

//         // 1. Check total reward token balance in the contract
//         try {
//             const rewardBalance = await engine.contract.read("getRewardTokenBalance", CHAIN, STAKING_ADDRESS, undefined, STAKING_ABI);
//             console.log("📊 Total Reward Token Balance:", rewardBalance.result);
//         } catch (error: any) {
//             console.log("❌ getRewardTokenBalance not available:", error?.message || error);
//         }

//         // 2. Check total rewards deposited
//         try {
//             const totalRewards = await engine.contract.read("totalRewards", CHAIN, STAKING_ADDRESS, undefined, STAKING_ABI);
//             console.log("💰 Total Rewards:", totalRewards.result);
//         } catch (error: any) {
//             console.log("❌ totalRewards not available:", error?.message || error);
//         }

//         // 3. Check reward rate
//         try {
//             const rewardRate = await engine.contract.read("rewardRate", CHAIN, STAKING_ADDRESS, undefined, STAKING_ABI);
//             console.log("⚡ Reward Rate:", rewardRate.result);
//         } catch (error: any) {
//             console.log("❌ rewardRate not available:", error?.message || error);
//         }

//         // 4. If user address provided, check user-specific rewards
//         if (userAddress) {
//             console.log(`\n👤 Checking rewards for address: ${userAddress}`);
            
//             // Check earned rewards
//             try {
//                 const earned = await engine.contract.read("earned", CHAIN, STAKING_ADDRESS, userAddress, STAKING_ABI);
//                 console.log("🎁 Earned Rewards:", earned.result);
//             } catch (error: any) {
//                 console.log("❌ earned function not available:", error?.message || error);
//             }

//             // Check rewardOf
//             try {
//                 const rewardOf = await engine.contract.read("rewardOf", CHAIN, STAKING_ADDRESS, userAddress, STAKING_ABI);
//                 console.log("💎 RewardOf:", rewardOf.result);
//             } catch (error: any) {
//                 console.log("❌ rewardOf function not available:", error?.message || error);
//             }
//         }

//         console.log("\n✅ Reward check completed!\n");

//     } catch (error: any) {
//         console.error("❌ Error checking reward info:", error?.message || error);
//     }
// };

// await checkRewardInfo("0x8049566097B6163C7c61d9085076C2dAaa4C41Bf"); // Check rewards for a specific address



const getRewardTokenBalance = async (address: string): Promise<any> => {
    try {
        const balance = await engine.contract.read("getRewardTokenBalance()", CHAIN, STAKING_ADDRESS, "", GET_REWARD_TOKEN_BALANCE_ABI)

        console.log(`Reward token balance for ${address}: ${balance}`);
        return balance;
    } catch (error) {
        console.error("Error getting reward token balance:", error);
        throw new Error(`Failed to get reward token balance: ${error}`);
    }
};


const getStakeInfo = async (address: string): Promise<any> => {
    try {
        const stakeInfo = await engine.contract.read("getStakeInfo", CHAIN, STAKING_ADDRESS, address, GET_STAKE_INFO_ABI)

        console.log(`Stake information for ${address}: ${stakeInfo}`);
        return stakeInfo;
    } catch (error) {
        console.error("Error getting stake information:", error);
        throw new Error(`Failed to get stake information: ${error}`);
    }
};

await getStakeInfo("0xa23A9a2b962d387E9816A4FE1959dFE1cb2EF50e")

const getStakers = async (address: string): Promise<any> => {
    try {
        const stakerData = await engine.contract.read("stakers", CHAIN, STAKING_ADDRESS, address, STAKERS_ABI)

        console.log(`Stakers information for ${address}: ${stakerData.result}`);
        
        const [timeOfLastUpdate, conditionIdOflastUpdate, amountStaked, unclaimedRewards] = stakerData.result as string[];
        
        console.log(`Time of last update: ${timeOfLastUpdate}`);
        console.log(`Condition ID of last update: ${conditionIdOflastUpdate}`);
        console.log(`Amount staked (wei): ${amountStaked}`);
        console.log(`Unclaimed rewards (wei): ${unclaimedRewards}`);
        
        // Convert to human readable format
        const amountStakedFormatted = parseFloat(amountStaked) / Math.pow(10, 18);
        const unclaimedRewardsFormatted = parseFloat(unclaimedRewards) / Math.pow(10, 18);
        
        console.log(`Amount staked (formatted): ${amountStakedFormatted} tokens`);
        console.log(`Unclaimed rewards (formatted): ${unclaimedRewardsFormatted} tokens`);
        
        return stakerData.result;
    } catch (error) {
        console.error("Error getting staker information:", error);
        throw new Error(`Failed to get staker information: ${error}`);
    }
};

await getStakers("0xa23A9a2b962d387E9816A4FE1959dFE1cb2EF50e")

const getReleaseTimeFrame = async (address: string): Promise<any> => {
    try {
        const timeUnitData = await engine.contract.read("getTimeUnit", CHAIN, STAKING_ADDRESS, "", GET_TIME_UNIT_ABI)

        console.log(`Time unit data: ${timeUnitData.result}`);
        
        const timeUnit = timeUnitData.result as string;
        const timeUnitSeconds = parseInt(timeUnit);
        
        let timeUnitFormatted = `${timeUnitSeconds} seconds`;
        
        // Add more readable format
        if (timeUnitSeconds >= 86400) {
            const days = Math.floor(timeUnitSeconds / 86400);
            timeUnitFormatted += ` (${days} day${days > 1 ? 's' : ''})`;
        } else if (timeUnitSeconds >= 3600) {
            const hours = Math.floor(timeUnitSeconds / 3600);
            timeUnitFormatted += ` (${hours} hour${hours > 1 ? 's' : ''})`;
        } else if (timeUnitSeconds >= 60) {
            const minutes = Math.floor(timeUnitSeconds / 60);
            timeUnitFormatted += ` (${minutes} minute${minutes > 1 ? 's' : ''})`;
        }
        
        console.log(`Time unit (raw): ${timeUnit}`);
        console.log(`Time unit (formatted): ${timeUnitFormatted}`);
        
        return timeUnitData.result;
    } catch (error) {
        console.error("Error getting release time frame:", error);
        throw new Error(`Failed to get release time frame: ${error}`);
    }
};

await getReleaseTimeFrame("")