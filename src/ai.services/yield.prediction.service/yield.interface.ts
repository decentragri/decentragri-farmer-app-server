export interface YieldPredictionParams {
    farmName: string;
    cropType: string;
    expectedHarvestDate?: string; // ISO date string
    farmSize?: number; // in acres or hectares
    plantingDate?: string; // ISO date string
}

export interface YieldPredictionResult {
    cropType: string;
    farmName: string;
    predictedYield: {
        amount: number;
        unit: string; // e.g., "tons", "kg", "bushels"
        confidence: number; // 0-100%
    };
    yieldQuality: {
        grade: string; // e.g., "Premium", "Standard", "Below Average"
        qualityScore: number; // 0-100%
    };
    factors: {
        soilHealth: {
            score: number; // 0-100%
            impact: string;
            trends: string[];
        };
        plantHealth: {
            score: number; // 0-100%
            impact: string;
            diseases: string[];
            trends: string[];
        };
        weatherConditions: {
            score: number; // 0-100%
            impact: string;
            favorableFactors: string[];
            riskFactors: string[];
        };
        pestPressure: {
            score: number; // 0-100%
            impact: string;
            threats: string[];
        };
    };
    recommendations: string[];
    risks: {
        level: "Low" | "Medium" | "High";
        factors: string[];
        mitigation: string[];
    };
    confidence: {
        overall: number; // 0-100%
        dataQuality: string;
        historicalAccuracy?: number;
    };
    generatedAt: string;
    harvestWindow: {
        optimal: string; // ISO date
        earliest: string; // ISO date
        latest: string; // ISO date
    };
}

export interface YieldHistoryData {
    plantScans: any[];
    soilReadings: any[];
    pestReports: any[];
    weatherData?: any;
    farmSize?: number;
    plantingDate?: string;
    expectedHarvestDate?: string;
}
