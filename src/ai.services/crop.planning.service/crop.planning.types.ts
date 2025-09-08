/**
 * Professional Type Definitions for Crop Planning Service
 * Replaces all 'any' types with proper, strongly-typed interfaces
 */

import type { CropPlanningRequest, CropPlanningResponse } from './crop.planning.interface';

// Historical Data Types
export interface PlantingRecord {
  id: string;
  date: string;
  cropType: string;
  seedVariety: string;
  plantingMethod: 'direct_seed' | 'transplant' | 'broadcast';
  seedRate: number;
  plantingDepth: number;
  rowSpacing: number;
  fieldConditions: {
    soilMoisture: number;
    temperature: number;
    weather: string;
  };
  location: {
    fieldId: string;
    coordinates: { lat: number; lng: number };
  };
  createdAt: string;
  farmName: string;
  username: string;
}

export interface HarvestRecord {
  id: string;
  date: string;
  cropType: string;
  actualYield: number;
  yieldUnit: 'kg' | 'tons' | 'bushels' | 'pounds';
  quality: {
    grade: 'A' | 'B' | 'C';
    moisture: number;
    damaged: number;
  };
  marketPrice: number;
  priceUnit: 'per_kg' | 'per_ton' | 'per_bushel';
  totalRevenue: number;
  harvestMethod: 'manual' | 'mechanical';
  storageLocation: string;
  buyer?: string;
  createdAt: string;
  farmName: string;
  username: string;
}

export interface WeatherCondition {
  id: string;
  date: string;
  temperature: {
    min: number;
    max: number;
    average: number;
  };
  humidity: number;
  rainfall: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  uvIndex: number;
  conditions: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy';
  location: { lat: number; lng: number };
  source: 'api' | 'sensor' | 'manual';
  createdAt: string;
}

export interface SoilHealthReading {
  id: string;
  date: string;
  location: {
    fieldId: string;
    coordinates: { lat: number; lng: number };
    depth: number;
  };
  pH: number;
  fertility: number;
  moisture: number;
  temperature: number;
  organicMatter: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  micronutrients: {
    iron: number;
    zinc: number;
    manganese: number;
    copper: number;
  };
  texture: 'sandy' | 'loamy' | 'clay' | 'silty';
  compaction: number;
  drainage: 'excellent' | 'good' | 'moderate' | 'poor';
  testMethod: 'lab' | 'sensor' | 'field_test';
  createdAt: string;
  farmName: string;
  username: string;
}

export interface PestIssue {
  id: string;
  date: string;
  pestType: string;
  pestSpecies: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedArea: number;
  symptoms: string[];
  location: {
    fieldId: string;
    coordinates: { lat: number; lng: number };
  };
  treatment: {
    method: 'organic' | 'chemical' | 'biological' | 'mechanical';
    product?: string;
    application: {
      date: string;
      rate: number;
      coverage: number;
    };
  };
  outcome: {
    effectiveness: number;
    sideEffects: string[];
    costUSD: number;
  };
  images: string[];
  createdAt: string;
  farmName: string;
  username: string;
}

// Market Data Types
export interface PricePoint {
  date: string;
  price: number;
  currency: string;
  unit: string;
  market: string;
  volume: number;
  source: 'market_api' | 'local_market' | 'commodity_exchange';
}

export interface MarketTrend {
  cropType: string;
  region: string;
  currentPrice: number;
  priceHistory: PricePoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: number;
  demand: 'low' | 'medium' | 'high';
  supply: 'low' | 'medium' | 'high';
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    nextSeason: number;
    confidence: number;
  };
  seasonalFactors: {
    peakDemand: string[];
    lowDemand: string[];
    harvestImpact: number;
  };
}

// Regional and Crop Data Types
export interface CropVariety {
  name: string;
  species: string;
  characteristics: {
    maturityDays: number;
    yieldPotential: number;
    diseaseResistance: string[];
    climateRequirements: {
      minTemp: number;
      maxTemp: number;
      rainfall: number;
      sunlight: number;
    };
    soilRequirements: {
      phRange: { min: number; max: number };
      fertility: 'low' | 'medium' | 'high';
      drainage: string;
    };
  };
  suitable: boolean;
  adaptation: number;
}

export interface RegionalCropData {
  region: string;
  climate: {
    zone: string;
    averageTemp: number;
    averageRainfall: number;
    growingSeasonLength: number;
    lastFrostDate: string;
    firstFrostDate: string;
  };
  suitableCrops: CropVariety[];
  commonPests: string[];
  commonDiseases: string[];
  bestPractices: string[];
  localMarkets: string[];
  extensionServices: string[];
}

// Crop Rotation Types
export interface CropRotationHistory {
  farmName: string;
  rotationCycle: {
    year: number;
    season: string;
    cropType: string;
    fieldId: string;
    performance: {
      yield: number;
      quality: number;
      profitability: number;
    };
  }[];
  benefits: {
    soilHealth: number;
    pestReduction: number;
    yieldImprovement: number;
    profitIncrease: number;
  };
  currentCycle: number;
  totalCycles: number;
  effectiveness: number;
}

// AI Analysis Data Types
export interface CropPlanningAnalysisData {
  request: CropPlanningRequest;
  historicalData: {
    plantingHistory: PlantingRecord[];
    harvestHistory: HarvestRecord[];
    weatherHistory: WeatherCondition[];
    soilHistory: SoilHealthReading[];
    pestHistory: PestIssue[];
  };
  regionalData: RegionalCropData;
  marketData: MarketTrend;
  rotationHistory: CropRotationHistory;
  currentConditions: {
    weather: WeatherCondition;
    soil: SoilHealthReading;
    marketPrice: PricePoint;
  };
}

// Performance Analysis Types
export interface CropPerformanceData {
  farmId: string;
  cropType: string;
  season: string;
  year: number;
  plantingDate: string;
  harvestDate: string;
  actualYield: number;
  expectedYield: number;
  yieldVariance: number;
  qualityMetrics: {
    grade: string;
    moisture: number;
    damaged: number;
  };
  financialMetrics: {
    revenue: number;
    costs: number;
    profit: number;
    roi: number;
  };
  inputUsage: {
    seeds: number;
    fertilizer: number;
    pesticides: number;
    water: number;
    labor: number;
  };
  weatherImpact: {
    favorableDays: number;
    adverseEvents: string[];
    overallImpact: number;
  };
  soilImpact: {
    beforePlanting: SoilHealthReading;
    afterHarvest: SoilHealthReading;
    improvement: number;
  };
}

// Seasonal Recommendations Types
export interface SeasonalRecommendationData {
  location: { lat: number; lng: number; region?: string };
  currentSeason: string;
  farmSize: number;
  soilType?: string;
  weatherForecast: {
    shortTerm: WeatherCondition[];
    longTerm: {
      temperature: number;
      rainfall: number;
      conditions: string;
    };
  };
  suitableCrops: CropVariety[];
  marketOpportunities: MarketTrend[];
  riskFactors: {
    weather: string[];
    pests: string[];
    diseases: string[];
    market: string[];
  };
  bestPractices: {
    planting: string[];
    maintenance: string[];
    harvesting: string[];
    postHarvest: string[];
  };
}

// Farm Data Aggregation Types
export interface FarmDataSummary {
  farmName: string;
  username: string;
  totalArea: number;
  activeFields: number;
  currentCrops: string[];
  averageYield: number;
  soilHealthScore: number;
  sustainabilityScore: number;
  profitabilityTrend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
}

// Weather Integration Types
export interface WeatherForecast {
  location: { lat: number; lng: number };
  current: WeatherCondition;
  daily: WeatherCondition[];
  extended: {
    temperature: { min: number; max: number };
    precipitation: number;
    conditions: string;
    confidence: number;
  }[];
  alerts: {
    type: 'frost' | 'drought' | 'flood' | 'storm' | 'hail';
    severity: 'low' | 'medium' | 'high';
    startDate: string;
    endDate: string;
    recommendations: string[];
  }[];
}

// Re-export from interface for backward compatibility
export type { CropPlanningRequest, CropPlanningResponse } from './crop.planning.interface';
