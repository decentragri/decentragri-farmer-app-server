export interface FarmReportParams {
    farmName: string;
    reportType: "weekly" | "monthly" | "seasonal" | "custom";
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
    includeYieldPredictions?: boolean;
    includeSoilAnalysis?: boolean;
    includePlantHealth?: boolean;
    includePestReports?: boolean;
    includeWeatherSummary?: boolean;
    cropTypes?: string[]; // Specific crops to focus on
}

export interface FarmReportResult {
    farmName: string;
    reportType: string;
    reportPeriod: {
        startDate: string;
        endDate: string;
        daysAnalyzed: number;
    };
    executiveSummary: {
        overallFarmHealth: {
            score: number; // 0-100
            grade: "Excellent" | "Good" | "Fair" | "Poor";
            trend: "Improving" | "Stable" | "Declining";
        };
        keyInsights: string[];
        criticalActions: string[];
        opportunities: string[];
    };
    detailedAnalysis: {
        soilHealth: {
            averageScore: number;
            trends: string[];
            recommendations: string[];
            criticalIssues: string[];
            dataPoints: number;
        };
        plantHealth: {
            averageScore: number;
            trends: string[];
            diseases: string[];
            recommendations: string[];
            cropPerformance: Array<{
                cropType: string;
                healthScore: number;
                scansAnalyzed: number;
                trend: string;
            }>;
            dataPoints: number;
        };
        pestManagement: {
            threatLevel: "Low" | "Medium" | "High";
            activePests: string[];
            treatmentEffectiveness: string[];
            preventiveActions: string[];
            incidentCount: number;
        };
        weatherImpact: {
            favorableConditions: string[];
            challenges: string[];
            recommendations: string[];
            weatherScore: number;
        };
        yieldOutlook?: {
            projectedYields: Array<{
                cropType: string;
                predictedAmount: number;
                unit: string;
                confidence: number;
                harvestDate: string;
            }>;
            totalEstimatedValue: number;
            recommendations: string[];
        };
    };
    trendAnalysis: {
        soilTrends: Array<{
            metric: string;
            direction: "Improving" | "Stable" | "Declining";
            percentageChange: number;
            timeframe: string;
        }>;
        plantHealthTrends: Array<{
            cropType: string;
            healthTrend: "Improving" | "Stable" | "Declining";
            keyChanges: string[];
        }>;
        pestTrends: {
            incidentFrequency: "Increasing" | "Stable" | "Decreasing";
            newThreats: string[];
            managementEffectiveness: string;
        };
    };
    recommendations: {
        immediate: string[]; // Actions needed this week
        shortTerm: string[]; // Actions for next 2-4 weeks
        longTerm: string[]; // Actions for next season/year
        investment: string[]; // Equipment or infrastructure recommendations
    };
    dataQuality: {
        soilReadings: number;
        plantScans: number;
        pestReports: number;
        weatherDataPoints: number;
        completenessScore: number; // 0-100
        reliability: "High" | "Medium" | "Low";
    };
    nextReportDate: string;
    generatedAt: string;
    reportId: string;
}

export interface FarmReportData {
    farmInfo: {
        farmName: string;
        totalArea?: number;
        activeCrops: string[];
    };
    soilData: any[];
    plantData: any[];
    pestData: any[];
    weatherData?: any;
    yieldPredictions?: any[];
    reportPeriod: {
        startDate: string;
        endDate: string;
    };
}
