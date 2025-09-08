/**
 * Cypher queries for yield prediction data aggregation
 */

/**
 * Get comprehensive farm data for yield prediction
 * Includes plant scans, soil readings, and pest reports for the past growing season
 */
export const getYieldPredictionDataCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})
    
    // Get plant scans for the crop type
    OPTIONAL MATCH (f)-[:HAS_PLANT_SCAN]->(ps:PlantScan {cropType: $cropType})
        WHERE ps.date >= datetime($startDate)
    
    // Get soil readings for the farm
    OPTIONAL MATCH (f)-[:HAS_SENSOR]->(s:Sensor)-[:HAS_READING]->(sr:Reading)
        WHERE sr.createdAt >= datetime($startDate)
        AND (sr.cropType = $cropType OR sr.cropType IS NULL)
    OPTIONAL MATCH (sr)-[:INTERPRETED_AS]->(si:Interpretation)
    
    // Get pest reports for the crop type
    OPTIONAL MATCH (u)-[:REPORTED]->(pr:PestReport)
        WHERE pr.cropAffected = $cropType 
        AND pr.createdAt >= datetime($startDate)
    
    RETURN 
        collect(DISTINCT {
            id: ps.id,
            cropType: ps.cropType,
            date: ps.date,
            note: ps.note,
            interpretation: ps.interpretation,
            imageUri: ps.imageUri
        }) AS plantScans,
        
        collect(DISTINCT {
            id: sr.id,
            fertility: sr.fertility,
            moisture: sr.moisture,
            ph: sr.ph,
            temperature: sr.temperature,
            sunlight: sr.sunlight,
            humidity: sr.humidity,
            cropType: sr.cropType,
            createdAt: sr.createdAt,
            interpretation: si.value
        }) AS soilReadings,
        
        collect(DISTINCT {
            pestType: pr.pestType,
            cropAffected: pr.cropAffected,
            severityLevel: pr.severityLevel,
            lat: pr.lat,
            lng: pr.lng,
            dateTime: pr.dateTime,
            createdAt: pr.createdAt
        }) AS pestReports
`;

/**
 * Get historical yield data if available
 */
export const getHistoricalYieldDataCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})
    OPTIONAL MATCH (f)-[:HAS_YIELD_RECORD]->(yr:YieldRecord {cropType: $cropType})
        WHERE yr.harvestDate >= datetime($startDate)
    RETURN collect({
        cropType: yr.cropType,
        actualYield: yr.actualYield,
        yieldUnit: yr.yieldUnit,
        quality: yr.quality,
        harvestDate: yr.harvestDate,
        plantingDate: yr.plantingDate,
        farmSize: yr.farmSize
    }) AS historicalYields
`;

/**
 * Save yield prediction result
 */
export const saveYieldPredictionCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})
    CREATE (yp:YieldPrediction {
        id: $predictionId,
        cropType: $cropType,
        predictedAmount: $predictedAmount,
        yieldUnit: $yieldUnit,
        confidence: $confidence,
        qualityGrade: $qualityGrade,
        qualityScore: $qualityScore,
        soilHealthScore: $soilHealthScore,
        plantHealthScore: $plantHealthScore,
        weatherScore: $weatherScore,
        pestPressureScore: $pestPressureScore,
        riskLevel: $riskLevel,
        overallConfidence: $overallConfidence,
        dataQuality: $dataQuality,
        optimalHarvestDate: datetime($optimalHarvestDate),
        earliestHarvestDate: datetime($earliestHarvestDate),
        latestHarvestDate: datetime($latestHarvestDate),
        recommendations: $recommendations,
        riskFactors: $riskFactors,
        mitigationActions: $mitigationActions,
        createdAt: datetime($createdAt),
        farmSize: $farmSize,
        plantingDate: datetime($plantingDate)
    })
    CREATE (f)-[:HAS_YIELD_PREDICTION]->(yp)
    RETURN yp.id AS predictionId
`;

/**
 * Get recent yield predictions for a farm and crop
 */
export const getRecentYieldPredictionsCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})-[:HAS_YIELD_PREDICTION]->(yp:YieldPrediction {cropType: $cropType})
    RETURN yp
    ORDER BY yp.createdAt DESC
    LIMIT $limit
`;
