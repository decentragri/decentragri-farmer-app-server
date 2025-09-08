export interface CropPlanningRequest {
  farmName: string;
  farmId: string;
  cropType: string;
  farmSize: number; // in hectares
  location: {
    lat: number;
    lng: number;
    region?: string;
  };
  soilType?: string;
  irrigationSystem?: string;
  currentSeason?: string;
  planningHorizon?: number; // months ahead to plan
  preferences?: {
    riskTolerance: 'low' | 'medium' | 'high';
    profitPriority: 'maximum' | 'stable' | 'sustainable';
    organicFarming: boolean;
  };
}

export interface PlantingWindow {
  cropType: string;
  optimalStart: string;
  optimalEnd: string;
  earliestStart: string;
  latestEnd: string;
  confidence: number;
  reasoning: string;
}

export interface HarvestWindow {
  cropType: string;
  optimalStart: string;
  optimalEnd: string;
  estimatedYield: number;
  marketWindow: {
    bestPriceWindow: string;
    expectedPrice: number;
    marketDemand: 'low' | 'medium' | 'high';
  };
  confidence: number;
  reasoning: string;
}

export interface WeatherFactors {
  averageTemperature: number;
  rainfall: number;
  frostRisk: number;
  droughtRisk: number;
  extremeWeatherEvents: string[];
  seasonalForecast: string;
}

export interface MarketAnalysis {
  currentPrice: number;
  priceHistory: {
    month: string;
    averagePrice: number;
  }[];
  priceTrend: 'increasing' | 'decreasing' | 'stable';
  demandForecast: 'low' | 'medium' | 'high';
  competitionLevel: 'low' | 'medium' | 'high';
  recommendedMarketStrategy: string;
}

export interface CropRotationPlan {
  currentCrop: string;
  nextSeason: {
    recommendedCrop: string;
    benefits: string[];
    plantingDate: string;
  };
  yearPlan: {
    season: string;
    crop: string;
    reasoning: string;
  }[];
  soilHealthImpact: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  weatherRisks: string[];
  marketRisks: string[];
  diseaseRisks: string[];
  mitigationStrategies: string[];
  contingencyPlan: string;
}

export interface CropPlanningResponse {
  farmName: string;
  cropType: string;
  planningDate: string;
  
  // Core recommendations
  plantingPlan: PlantingWindow;
  harvestPlan: HarvestWindow;
  
  // Supporting analysis
  weatherFactors: WeatherFactors;
  marketAnalysis: MarketAnalysis;
  cropRotationPlan: CropRotationPlan;
  riskAssessment: RiskAssessment;
  
  // Financial projections
  costAnalysis: {
    seedCosts: number;
    fertilizer: number;
    pesticides: number;
    labor: number;
    irrigation: number;
    total: number;
  };
  
  revenueProjection: {
    estimatedYield: number;
    pricePerUnit: number;
    grossRevenue: number;
    netProfit: number;
    profitMargin: number;
  };
  
  // Recommendations
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  
  // AI analysis
  aiInsights: string;
  confidence: number;
  dataQuality: {
    historicalData: 'poor' | 'fair' | 'good' | 'excellent';
    weatherData: 'poor' | 'fair' | 'good' | 'excellent';
    marketData: 'poor' | 'fair' | 'good' | 'excellent';
  };
  
  generatedAt: string;
}

export interface HistoricalFarmData {
  plantingDates: string[];
  harvestDates: string[];
  yields: number[];
  weatherConditions: WeatherCondition[];
  soilHealth: SoilHealthReading[];
  pestIssues: PestIssue[];
  marketPrices: number[];
}

// Import proper types instead of using any
interface WeatherCondition {
  id: string;
  date: string;
  temperature: { min: number; max: number; average: number };
  humidity: number;
  rainfall: number;
  windSpeed: number;
  conditions: string;
  location: { lat: number; lng: number };
}

interface SoilHealthReading {
  id: string;
  date: string;
  pH: number;
  fertility: number;
  moisture: number;
  temperature: number;
  organicMatter: number;
  nutrients: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  texture: string;
}

interface PestIssue {
  id: string;
  date: string;
  pestType: string;
  severity: 'low' | 'medium' | 'high';
  affectedArea: number;
  treatment: {
    method: string;
    effectiveness: number;
  };
  location: { lat: number; lng: number };
}
