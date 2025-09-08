/**
 * Cypher queries for farm report data aggregation
 */

/**
 * Get comprehensive farm data for report generation
 * Aggregates all farm activities within the specified date range
 */
export const getFarmReportDataCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})
    
    // Get plant scans within date range
    OPTIONAL MATCH (f)-[:HAS_PLANT_SCAN]->(ps:PlantScan)
        WHERE ps.date >= datetime($startDate) AND ps.date <= datetime($endDate)
    
    // Get soil readings within date range
    OPTIONAL MATCH (f)-[:HAS_SENSOR]->(s:Sensor)-[:HAS_READING]->(sr:Reading)
        WHERE sr.createdAt >= datetime($startDate) AND sr.createdAt <= datetime($endDate)
    OPTIONAL MATCH (sr)-[:INTERPRETED_AS]->(si:Interpretation)
    
    // Get pest reports within date range
    OPTIONAL MATCH (u)-[:REPORTED]->(pr:PestReport)
        WHERE pr.createdAt >= datetime($startDate) AND pr.createdAt <= datetime($endDate)
    
    // Get yield predictions within date range
    OPTIONAL MATCH (f)-[:HAS_YIELD_PREDICTION]->(yp:YieldPrediction)
        WHERE yp.createdAt >= datetime($startDate) AND yp.createdAt <= datetime($endDate)
    
    RETURN 
        f.farmName AS farmName,
        f.totalArea AS totalArea,
        
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
            createdAt: pr.createdAt,
            imageUri: pr.imageUri
        }) AS pestReports,
        
        collect(DISTINCT {
            id: yp.id,
            cropType: yp.cropType,
            predictedAmount: yp.predictedAmount,
            yieldUnit: yp.yieldUnit,
            confidence: yp.confidence,
            qualityGrade: yp.qualityGrade,
            qualityScore: yp.qualityScore,
            riskLevel: yp.riskLevel,
            optimalHarvestDate: yp.optimalHarvestDate,
            createdAt: yp.createdAt
        }) AS yieldPredictions
`;

/**
 * Get historical farm data for trend comparison
 * Retrieves data from the period before the current report period
 */
export const getHistoricalFarmDataCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})
    
    // Get historical plant scans for comparison
    OPTIONAL MATCH (f)-[:HAS_PLANT_SCAN]->(ps:PlantScan)
        WHERE ps.date >= datetime($historicalStartDate) AND ps.date <= datetime($historicalEndDate)
    
    // Get historical soil readings for comparison
    OPTIONAL MATCH (f)-[:HAS_SENSOR]->(s:Sensor)-[:HAS_READING]->(sr:Reading)
        WHERE sr.createdAt >= datetime($historicalStartDate) AND sr.createdAt <= datetime($historicalEndDate)
    OPTIONAL MATCH (sr)-[:INTERPRETED_AS]->(si:Interpretation)
    
    // Get historical pest reports for comparison
    OPTIONAL MATCH (u)-[:REPORTED]->(pr:PestReport)
        WHERE pr.createdAt >= datetime($historicalStartDate) AND pr.createdAt <= datetime($historicalEndDate)
    
    RETURN 
        collect(DISTINCT {
            cropType: ps.cropType,
            date: ps.date,
            interpretation: ps.interpretation
        }) AS historicalPlantScans,
        
        collect(DISTINCT {
            fertility: sr.fertility,
            moisture: sr.moisture,
            ph: sr.ph,
            temperature: sr.temperature,
            sunlight: sr.sunlight,
            humidity: sr.humidity,
            cropType: sr.cropType,
            createdAt: sr.createdAt,
            interpretation: si.value
        }) AS historicalSoilReadings,
        
        collect(DISTINCT {
            pestType: pr.pestType,
            cropAffected: pr.cropAffected,
            severityLevel: pr.severityLevel,
            createdAt: pr.createdAt
        }) AS historicalPestReports
`;

/**
 * Save farm report to database
 */
export const saveFarmReportCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})
    CREATE (fr:FarmReport {
        id: $reportId,
        reportType: $reportType,
        startDate: datetime($startDate),
        endDate: datetime($endDate),
        daysAnalyzed: $daysAnalyzed,
        overallHealthScore: $overallHealthScore,
        overallHealthGrade: $overallHealthGrade,
        overallHealthTrend: $overallHealthTrend,
        soilHealthScore: $soilHealthScore,
        plantHealthScore: $plantHealthScore,
        pestThreatLevel: $pestThreatLevel,
        weatherScore: $weatherScore,
        dataCompletenessScore: $dataCompletenessScore,
        dataReliability: $dataReliability,
        keyInsights: $keyInsights,
        criticalActions: $criticalActions,
        opportunities: $opportunities,
        immediateActions: $immediateActions,
        shortTermActions: $shortTermActions,
        longTermActions: $longTermActions,
        investmentActions: $investmentActions,
        nextReportDate: datetime($nextReportDate),
        createdAt: datetime($createdAt),
        reportContent: $reportContent
    })
    CREATE (f)-[:HAS_FARM_REPORT]->(fr)
    RETURN fr.id AS reportId
`;

/**
 * Get recent farm reports
 */
export const getRecentFarmReportsCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})-[:HAS_FARM_REPORT]->(fr:FarmReport)
    RETURN fr
    ORDER BY fr.createdAt DESC
    LIMIT $limit
`;

/**
 * Get farm report by ID
 */
export const getFarmReportByIdCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})-[:HAS_FARM_REPORT]->(fr:FarmReport {id: $reportId})
    RETURN fr
`;

/**
 * Get all active crop types for a farm
 */
export const getFarmActiveCropsCypher = `
    MATCH (u:User {username: $username})-[:OWNS]->(f:Farm {farmName: $farmName})
    OPTIONAL MATCH (f)-[:HAS_PLANT_SCAN]->(ps:PlantScan)
        WHERE ps.date >= datetime($recentDate)
    OPTIONAL MATCH (f)-[:HAS_SENSOR]->(s:Sensor)-[:HAS_READING]->(sr:Reading)
        WHERE sr.createdAt >= datetime($recentDate) AND sr.cropType IS NOT NULL
    RETURN collect(DISTINCT ps.cropType) + collect(DISTINCT sr.cropType) AS activeCrops
`;
