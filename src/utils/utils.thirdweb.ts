//** THIRDWEB IMPORTS */
import { createThirdwebClient, Engine, getContract } from "thirdweb";
import { upload } from "thirdweb/storage";
import { readFileSync } from 'fs';
import type { ThirdwebClient } from 'thirdweb';
import type { Chain } from 'thirdweb/chains';

//** CONSTANTS IMPORT */
import { SECRET_KEY } from "./constants";
import path from "path";
import { baseSepolia } from "thirdweb/chains";


//**THIRDWEB SDK CONFIGURATION */
// Create a Thirdweb client instance
export const client = createThirdwebClient({
  clientId: "758a938bc85320ceb23c40418e01618a",
  secretKey: SECRET_KEY,
});


/**
 * Uploads an object to IPFS using Thirdweb SDK.
 * @param object - The object to upload.
 * @returns The IPFS URI of the uploaded object.
 */
export const uploadObjectIPFS = async (object: any): Promise<string> => {
    try {
        const uris = await upload({
            client,
            files: [object],
          });
        return uris[0];

    } catch (error) {
        console.error("Error uploading to IPFS:", error);
        throw new Error("Failed to upload to IPFS");
    }
}

export const uploadPicIPFS = async (filePath: string): Promise<string> => {
	try {
		const buffer = readFileSync(filePath);
		const fileName = path.basename(filePath);

		const file = new File([buffer], fileName, {
			type: 'image/png'
		});

		const uri = await upload({
			client,
			files: [file],
		});


		return uri;
	} catch (error) {
		console.error("Error uploading to IPFS:", error);
		throw new Error("Failed to upload to IPFS");
	}
};

export const uploadPicBuffer = async (buffer: Buffer, fileName: string): Promise<string> => {
	try {


		const file = new File([buffer], fileName, {
			type: 'image/png'
		});

		const uri = await upload({
			client,
			files: [file],
		});

    console.log(uri)

		return uri;
	} catch (error) {
		console.error("Error uploading to IPFS:", error);
		throw new Error("Failed to upload to IPFS");
	}
};



export const serverWallet = async (walletAddress: string) => {
    return Engine.serverWallet({
      client,
      address: walletAddress, // your admin wallet address
      vaultAccessToken: process.env.VAULT_ACCESS_TOKEN!,
    });
}




export const transactionContract = (address: string, chain: Chain = baseSepolia) => {
  return getContract({ client, address, chain });
};

