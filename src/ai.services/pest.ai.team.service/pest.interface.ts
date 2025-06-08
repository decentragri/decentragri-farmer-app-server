export interface PestRiskForecastParams {
    farmName: string;
    username: string;
    location: {
        lat: number;
        lng: number;
    };
    cropType: string;
}