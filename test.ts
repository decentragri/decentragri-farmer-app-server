import { getContract } from "thirdweb";
import { SECRET_KEY } from "./src/utils/constants";

const fetchRSWETHPrice = async () => {

	const url = 'https://1.insight.thirdweb.com/v1/tokens/price?address=0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0';

	const res = await fetch(url, {
		headers: {

            'X-Secret-Key': SECRET_KEY,
		}
	});

    const json = await res.json();

    console.log("Response:", json.data);
	console.log("RSWETH price:", json?.data?.[0]?.price_usd);




};

fetchRSWETHPrice();
