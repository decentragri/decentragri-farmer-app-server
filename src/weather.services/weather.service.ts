//** CONFIG IMPORT */
import { WEATHER_API_KEY } from "../utils/constants";

//** CLASS IMPORT */
import TokenService from "../security.services/token.service";
import type { WeatherData } from "./weather.interface";


class WeatherService {


    public async currentWeather(token: string, city: string): Promise<WeatherData> {
        const tokenService = new TokenService();
        await tokenService.verifyAccessToken(token);

        const url = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${city}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error fetching weather data: ${response.statusText}`);
            }
            const data: WeatherData = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching weather data:", error);
            throw error;
        }
    }



}

export default WeatherService;