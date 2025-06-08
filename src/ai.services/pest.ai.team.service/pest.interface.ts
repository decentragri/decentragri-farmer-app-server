export interface PestRiskForecastParams {
    farmName: string;
    username: string;
    location: {
        lat: number;
        lng: number;
    };
    cropType: string;
}




export interface PestScanResult extends PestRiskForecastParams {
    interpretation: string; // Analysis result from the pest risk forecast
    createdAt: string; // Timestamp of the analysis
    
}