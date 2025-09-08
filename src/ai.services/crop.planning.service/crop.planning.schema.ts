import { t } from 'elysia';

export const CropPlanningRequestSchema = t.Object({
  farmName: t.String({ minLength: 1 }),
  farmId: t.String({ minLength: 1 }),
  cropType: t.String({ minLength: 1 }),
  farmSize: t.Number({ minimum: 0.1 }),
  location: t.Object({
    lat: t.Number({ minimum: -90, maximum: 90 }),
    lng: t.Number({ minimum: -180, maximum: 180 }),
    region: t.Optional(t.String())
  }),
  soilType: t.Optional(t.String()),
  irrigationSystem: t.Optional(t.String()),
  currentSeason: t.Optional(t.String()),
  planningHorizon: t.Optional(t.Number({ minimum: 1, maximum: 36 })),
  preferences: t.Optional(t.Object({
    riskTolerance: t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')]),
    profitPriority: t.Union([t.Literal('maximum'), t.Literal('stable'), t.Literal('sustainable')]),
    organicFarming: t.Boolean()
  }))
});

export const PlantingWindowSchema = t.Object({
  cropType: t.String(),
  optimalStart: t.String(),
  optimalEnd: t.String(),
  earliestStart: t.String(),
  latestEnd: t.String(),
  confidence: t.Number({ minimum: 0, maximum: 100 }),
  reasoning: t.String()
});

export const HarvestWindowSchema = t.Object({
  cropType: t.String(),
  optimalStart: t.String(),
  optimalEnd: t.String(),
  estimatedYield: t.Number({ minimum: 0 }),
  marketWindow: t.Object({
    bestPriceWindow: t.String(),
    expectedPrice: t.Number({ minimum: 0 }),
    marketDemand: t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')])
  }),
  confidence: t.Number({ minimum: 0, maximum: 100 }),
  reasoning: t.String()
});

export const WeatherFactorsSchema = t.Object({
  averageTemperature: t.Number(),
  rainfall: t.Number(),
  frostRisk: t.Number({ minimum: 0, maximum: 100 }),
  droughtRisk: t.Number({ minimum: 0, maximum: 100 }),
  extremeWeatherEvents: t.Array(t.String()),
  seasonalForecast: t.String()
});

export const MarketAnalysisSchema = t.Object({
  currentPrice: t.Number({ minimum: 0 }),
  priceHistory: t.Array(t.Object({
    month: t.String(),
    averagePrice: t.Number({ minimum: 0 })
  })),
  priceTrend: t.Union([t.Literal('increasing'), t.Literal('decreasing'), t.Literal('stable')]),
  demandForecast: t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')]),
  competitionLevel: t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')]),
  recommendedMarketStrategy: t.String()
});

export const CropRotationPlanSchema = t.Object({
  currentCrop: t.String(),
  nextSeason: t.Object({
    recommendedCrop: t.String(),
    benefits: t.Array(t.String()),
    plantingDate: t.String()
  }),
  yearPlan: t.Array(t.Object({
    season: t.String(),
    crop: t.String(),
    reasoning: t.String()
  })),
  soilHealthImpact: t.String()
});

export const RiskAssessmentSchema = t.Object({
  overallRisk: t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')]),
  weatherRisks: t.Array(t.String()),
  marketRisks: t.Array(t.String()),
  diseaseRisks: t.Array(t.String()),
  mitigationStrategies: t.Array(t.String()),
  contingencyPlan: t.String()
});

export const CropPlanningResponseSchema = t.Object({
  farmName: t.String(),
  cropType: t.String(),
  planningDate: t.String(),
  
  plantingPlan: PlantingWindowSchema,
  harvestPlan: HarvestWindowSchema,
  
  weatherFactors: WeatherFactorsSchema,
  marketAnalysis: MarketAnalysisSchema,
  cropRotationPlan: CropRotationPlanSchema,
  riskAssessment: RiskAssessmentSchema,
  
  costAnalysis: t.Object({
    seedCosts: t.Number(),
    fertilizer: t.Number(),
    pesticides: t.Number(),
    labor: t.Number(),
    irrigation: t.Number(),
    total: t.Number()
  }),
  
  revenueProjection: t.Object({
    estimatedYield: t.Number(),
    pricePerUnit: t.Number(),
    grossRevenue: t.Number(),
    netProfit: t.Number(),
    profitMargin: t.Number()
  }),
  
  actionItems: t.Object({
    immediate: t.Array(t.String()),
    shortTerm: t.Array(t.String()),
    longTerm: t.Array(t.String())
  }),
  
  aiInsights: t.String(),
  confidence: t.Number({ minimum: 0, maximum: 100 }),
  dataQuality: t.Object({
    historicalData: t.Union([t.Literal('poor'), t.Literal('fair'), t.Literal('good'), t.Literal('excellent')]),
    weatherData: t.Union([t.Literal('poor'), t.Literal('fair'), t.Literal('good'), t.Literal('excellent')]),
    marketData: t.Union([t.Literal('poor'), t.Literal('fair'), t.Literal('good'), t.Literal('excellent')])
  }),
  
  generatedAt: t.String()
});

// Additional schemas for other endpoints
export const CropPerformanceAnalysisRequestSchema = t.Object({
  farmId: t.String({ minLength: 1 }),
  cropType: t.String({ minLength: 1 }),
  season: t.String({ minLength: 1 }),
  year: t.Number({ minimum: 2000, maximum: 2030 }),
  metrics: t.Optional(t.Array(t.String()))
});

export const SeasonalRecommendationsRequestSchema = t.Object({
  farmId: t.String({ minLength: 1 }),
  location: t.Object({
    lat: t.Number({ minimum: -90, maximum: 90 }),
    lng: t.Number({ minimum: -180, maximum: 180 }),
    region: t.Optional(t.String())
  }),
  currentSeason: t.String({ minLength: 1 }),
  farmSize: t.Number({ minimum: 0.1 }),
  soilType: t.Optional(t.String()),
  preferences: t.Optional(t.Object({
    sustainablePractices: t.Boolean(),
    organicFarming: t.Boolean(),
    budgetConstraints: t.Optional(t.Number({ minimum: 0 }))
  }))
});


export const cropPlanningSchema = {
    body: CropPlanningRequestSchema,
    headers: t.Object({ authorization: t.String() })
};

export const performanceAnalysisSchema = {
    body: CropPerformanceAnalysisRequestSchema,
    headers: t.Object({ authorization: t.String() })
};

export const seasonalRecommendationsSchema = {
    body: SeasonalRecommendationsRequestSchema,
    headers: t.Object({ authorization: t.String() })
};
