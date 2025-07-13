import { createServerWallet } from "thirdweb/engine";
import { PLANT_SCAN_EDITION_ADDRESS, SECRET_KEY, WEATHER_API_KEY } from "./src/utils/constants";
import { createThirdwebClient, Engine, getContract } from "thirdweb"
import { mintTo } from "thirdweb/extensions/erc1155";
import type { PlantImageScanParams } from "./src/ai.services/plant.ai.team.service/plant.interface";
import { baseSepolia, polygon } from "thirdweb/chains";
    export const getCurrentWeather = async (lat: number, lng: number): Promise<any> => {
        const url: string = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch weather: ${response.statusText}`);
        }
        return await response.json();
    };


const client = createThirdwebClient({
    secretKey: SECRET_KEY,
})



const result = await createServerWallet({
    client,
    label: "Server Wallet",
})  



const savePlantScanToNFT = async (
    data: PlantImageScanParams,
    image: string | number[], // Accept both URL string and byte array
    username: string
): Promise<void> => {
    const client = createThirdwebClient({
        secretKey: SECRET_KEY,
    });

    const serverWallet = Engine.serverWallet({
        client,
        address: "0xDCec5A8Fa6e26A04Ed94967475C7b13E9Ff56dE5", // your admin wallet address
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
            throw new Error("Invalid image format. Expected URL, byte array, or JSON string of bytes.");
        }
    }

    const contract = getContract({
        client,
        address: PLANT_SCAN_EDITION_ADDRESS,
        chain: baseSepolia, // or "mumbai", or any chain you configured
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
            username,
            note: data.note ?? "No additional notes",
            interpretation: data.interpretation,
        },
        attributes,
    };

    const transaction = mintTo({
        contract,
        to: "0x2e57Ba619C916b56a73EEBE9fD92D898D080F788", // receiver smart wallet
        supply: 1n,
        nft: metadata,
    });

    try {
        const { transactionId } = await serverWallet.enqueueTransaction({
            transaction,
        });
        console.log("Plant scan NFT minted successfully:", transactionId);
    } catch (error) {
        console.error("Error minting plant scan NFT:", error);
        throw new Error("Failed to mint plant scan NFT");
    }
}

savePlantScanToNFT({
    farmName: "Farm 1",
    cropType: "Tomato",
    note: "No additional notes",
    interpretation: "Healthy plant",
    imageBytes: "https://example.com/image.jpg"
}, "https://example.com/image.jpg", "username");
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