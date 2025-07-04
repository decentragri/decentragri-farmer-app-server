//** ELYSIA IMPORT
import Elysia from 'elysia';

//** SERVICE IMPORTS
import WeatherService from '../weather.services/weather.service';

//** SCHEMA IMPORTS
import { currentWeatherSchema } from '../weather.services/weather.schema';
import type { ForecastData, WeatherData } from '../weather.services/weather.interface';


const Weather = (app: Elysia) => {
    app.get('api/weather/current/:location', async ({ headers, params }): Promise<WeatherData> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const weatherService = new WeatherService();
            const output: WeatherData = await weatherService.currentWeather(jwtToken, params.location);
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }


    }, currentWeatherSchema
    )

    .get('api/weather/forecast/:location', async ({ headers, params }): Promise<ForecastData> => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);
            const weatherService = new WeatherService();
            const output: ForecastData = await weatherService.getForecast(jwtToken, params.location);
            return output;
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }, currentWeatherSchema)



    
    
}

export default Weather;