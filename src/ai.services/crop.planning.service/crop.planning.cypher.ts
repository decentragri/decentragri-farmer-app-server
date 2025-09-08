// Cypher queries for crop planning data retrieval

export const FETCH_HISTORICAL_FARM_DATA = `
MATCH (f:Farm {name: $farmName})
OPTIONAL MATCH (f)-[:HAS_SCAN]->(ps:PlantScan)
OPTIONAL MATCH (f)-[:HAS_ANALYSIS]->(sa:SoilAnalysis)
OPTIONAL MATCH (f)-[:HAS_REPORT]->(pr:PestReport)
OPTIONAL MATCH (f)-[:HAS_WEATHER]->(w:WeatherData)
OPTIONAL MATCH (f)-[:HAS_HARVEST]->(h:HarvestRecord)
OPTIONAL MATCH (f)-[:HAS_PLANTING]->(p:PlantingRecord)

RETURN 
  f.farmId as farmId,
  f.name as farmName,
  f.location as location,
  f.size as farmSize,
  f.soilType as soilType,
  
  // Historical planting data
  COLLECT(DISTINCT {
    date: p.plantingDate,
    cropType: p.cropType,
    yield: p.expectedYield,
    success: p.success
  }) as plantingHistory,
  
  // Historical harvest data
  COLLECT(DISTINCT {
    date: h.harvestDate,
    cropType: h.cropType,
    actualYield: h.actualYield,
    quality: h.quality,
    marketPrice: h.marketPrice
  }) as harvestHistory,
  
  // Soil health trends
  COLLECT(DISTINCT {
    date: sa.analysisDate,
    ph: sa.ph,
    fertility: sa.fertility,
    organicMatter: sa.organicMatter,
    healthScore: sa.overallHealthScore
  }) as soilTrends,
  
  // Weather patterns
  COLLECT(DISTINCT {
    date: w.date,
    temperature: w.temperature,
    rainfall: w.rainfall,
    humidity: w.humidity,
    weatherCondition: w.condition
  }) as weatherHistory,
  
  // Plant health issues
  COLLECT(DISTINCT {
    date: ps.scanDate,
    cropType: ps.cropType,
    healthScore: ps.healthScore,
    issues: ps.detectedIssues
  }) as plantHealthHistory,
  
  // Pest and disease history
  COLLECT(DISTINCT {
    date: pr.reportDate,
    pestType: pr.pestType,
    severity: pr.severity,
    treatment: pr.treatment,
    impact: pr.economicImpact
  }) as pestHistory
`;

export const FETCH_REGIONAL_CROP_DATA = `
MATCH (f:Farm)-[:LOCATED_IN]->(r:Region {name: $region})
MATCH (f)-[:HAS_HARVEST]->(h:HarvestRecord {cropType: $cropType})
WHERE h.harvestDate >= date($startDate) AND h.harvestDate <= date($endDate)

RETURN 
  r.name as region,
  r.climate as climate,
  r.soilType as soilType,
  
  // Regional averages
  AVG(h.actualYield) as avgYield,
  AVG(h.marketPrice) as avgMarketPrice,
  AVG(h.quality) as avgQuality,
  
  // Seasonal patterns
  COLLECT({
    month: h.harvestDate.month,
    yield: h.actualYield,
    price: h.marketPrice
  }) as seasonalData,
  
  // Success rates
  COUNT(CASE WHEN h.quality >= 80 THEN 1 END) as successfulHarvests,
  COUNT(h) as totalHarvests
`;

export const FETCH_MARKET_PRICE_TRENDS = `
MATCH (mp:MarketPrice {cropType: $cropType})
WHERE mp.date >= date($startDate)

RETURN 
  mp.cropType as cropType,
  mp.region as region,
  COLLECT({
    date: mp.date,
    price: mp.price,
    demand: mp.demand,
    supply: mp.supply,
    quality: mp.quality
  }) as priceHistory,
  
  // Trend analysis
  AVG(mp.price) as avgPrice,
  MAX(mp.price) as maxPrice,
  MIN(mp.price) as minPrice,
  STDDEV(mp.price) as priceVolatility

ORDER BY mp.date DESC
`;

export const FETCH_WEATHER_FORECAST_DATA = `
MATCH (wf:WeatherForecast)
WHERE wf.location.latitude = $lat AND wf.location.longitude = $lng
AND wf.forecastDate >= date() AND wf.forecastDate <= date($endDate)

RETURN 
  COLLECT({
    date: wf.forecastDate,
    temperature: wf.temperature,
    rainfall: wf.rainfall,
    humidity: wf.humidity,
    windSpeed: wf.windSpeed,
    condition: wf.condition,
    confidence: wf.confidence
  }) as forecast,
  
  // Seasonal summaries
  AVG(wf.temperature) as avgTemperature,
  SUM(wf.rainfall) as totalRainfall,
  AVG(wf.humidity) as avgHumidity,
  
  // Risk indicators
  COUNT(CASE WHEN wf.condition CONTAINS 'frost' THEN 1 END) as frostDays,
  COUNT(CASE WHEN wf.rainfall < 5 THEN 1 END) as dryDays,
  COUNT(CASE WHEN wf.condition CONTAINS 'storm' THEN 1 END) as stormDays
`;

export const STORE_CROP_PLANNING_RESULT = `
MERGE (f:Farm {name: $farmName})
CREATE (cp:CropPlan {
  planId: $planId,
  farmName: $farmName,
  cropType: $cropType,
  planningDate: datetime(),
  
  // Planting recommendations
  optimalPlantingStart: date($optimalPlantingStart),
  optimalPlantingEnd: date($optimalPlantingEnd),
  
  // Harvest projections
  optimalHarvestStart: date($optimalHarvestStart),
  optimalHarvestEnd: date($optimalHarvestEnd),
  estimatedYield: $estimatedYield,
  
  // Financial projections
  totalCosts: $totalCosts,
  grossRevenue: $grossRevenue,
  netProfit: $netProfit,
  profitMargin: $profitMargin,
  
  // Risk assessment
  overallRisk: $overallRisk,
  weatherRisk: $weatherRisk,
  marketRisk: $marketRisk,
  
  // AI analysis
  aiInsights: $aiInsights,
  confidence: $confidence,
  
  createdAt: datetime()
})

CREATE (f)-[:HAS_PLAN]->(cp)

RETURN cp.planId as planId, cp.createdAt as createdAt
`;

export const FETCH_SIMILAR_FARMS_DATA = `
MATCH (f:Farm)
WHERE f.soilType = $soilType 
AND f.climate = $climate
AND point.distance(f.location, point({latitude: $lat, longitude: $lng})) < $radius

MATCH (f)-[:HAS_HARVEST]->(h:HarvestRecord {cropType: $cropType})
WHERE h.harvestDate >= date($startDate)

RETURN 
  f.name as farmName,
  f.size as farmSize,
  AVG(h.actualYield) as avgYield,
  AVG(h.marketPrice) as avgPrice,
  AVG(h.quality) as avgQuality,
  COUNT(h) as totalHarvests,
  point.distance(f.location, point({latitude: $lat, longitude: $lng})) as distance

ORDER BY distance ASC
LIMIT 10
`;

export const FETCH_CROP_ROTATION_HISTORY = `
MATCH (f:Farm {name: $farmName})
MATCH (f)-[:HAS_PLANTING]->(p:PlantingRecord)
WHERE p.plantingDate >= date($startDate)

RETURN 
  COLLECT({
    date: p.plantingDate,
    cropType: p.cropType,
    season: p.season,
    rotationCycle: p.rotationCycle
  }) as rotationHistory,
  
  // Soil health correlation
  COLLECT({
    cropType: p.cropType,
    soilHealthBefore: p.soilHealthBefore,
    soilHealthAfter: p.soilHealthAfter
  }) as soilHealthImpact

ORDER BY p.plantingDate DESC
`;
