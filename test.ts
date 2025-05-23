import { SECRET_KEY } from "./src/utils/constants";

const fetchRSWETHPrice = async () => {

	const url = 'https://1.insight.thirdweb.com/v1/tokens/price?address=0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0';

	const res = await fetch(url, {
		headers: {

            'x-secret-key': SECRET_KEY,
		}
	});
	console.log("Response:", res);
    const json = await res.json();

    console.log("Response:", json.data);
	console.log("RSWETH price:", json?.data?.[0]?.price_usd);




};

const getCurrentWeather = async () => {
	const url = `http://api.weatherapi.com/v1/current.json?key=113ae7ff8ff84939bc2171746251205&q=Manila`
		const res = await fetch(url, {

	});

	const json = await res.json();

    console.log("Response:", json);

}


	await fetchRSWETHPrice();