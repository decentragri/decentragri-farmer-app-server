import { WEATHER_API_KEY } from "./src/utils/constants";

    export const getCurrentWeather = async (lat: number, lng: number): Promise<any> => {
        const url = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch weather: ${response.statusText}`);
        }
        return await response.json();
    };


    