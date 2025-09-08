//** MEMGRAPH DRIVER AND TYPES */
import { Driver, ManagedTransaction, Session } from "neo4j-driver";
import { getDriver } from "../../db/memgraph";

//** SERVICES */
import TokenService from "../../security.services/token.service";
import WeatherService from "../../weather.services/weather.service";

//** INTERFACES */
import type { FarmReportParams, FarmReportResult, FarmReportData } from "./report.interface";

//** CYPHER QUERIES */
import { 
    getFarmReportDataCypher,
    getHistoricalFarmDataCypher,
    saveFarmReportCypher,
    getRecentFarmReportsCypher,
    getFarmReportByIdCypher,
    getFarmActiveCropsCypher
} from "./report.cypher";

//** AI SCHEMA */
import { FARM_REPORT_PROMPT, REPORT_TEMPLATES, FARM_HEALTH_THRESHOLDS } from "./report.schema";

//** EXTERNAL APIs */
import { nanoid } from "nanoid";

class FarmReportService {

    /**
     * Generate comprehensive farm health report using AI analysis
     * @param token - JWT authentication token
     * @param params - FarmReportParams
     * @returns FarmReportResult
     */
    public async generateFarmReport(token: string, params: FarmReportParams): Promise<FarmReportResult> {
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();
        if (!session) throw new Error("Unable to create database session.");
        
        const tokenService = new TokenService();
        
        try {
            const username = await tokenService.verifyAccessToken(token);
            console.log(`Generating ${params.reportType} farm report for ${params.farmName}`);
            
            // Calculate report period dates
            const reportPeriod = this.calculateReportPeriod(params);
            
            // Collect comprehensive farm data
            const farmData = await this.collectFarmReportData(session, username, params.farmName, reportPeriod);
            
            // Get historical data for trend analysis
            const historicalData = await this.collectHistoricalData(session, username, params.farmName, reportPeriod);
            
            // Get weather data if needed
            let weatherData = null;
            if (params.includeWeatherSummary !== false) {
                weatherData = await this.getWeatherSummary(farmData);
            }
            
            // Generate AI report
            const report = await this.generateAIReport(farmData, historicalData, params, reportPeriod, weatherData);
            
            // Save report to database
            await this.saveReport(session, username, params.farmName, report);
            
            console.log(`Farm report generated successfully: ${report.reportId}`);
            return report;
            
        } catch (error: any) {
            console.error("Error generating farm report:", error.message || error);
            throw new Error("Failed to generate farm report.");
        } finally {
            await session.close();
        }
    }

    /**
     * Get recent farm reports
     */
    public async getRecentReports(token: string, farmName: string, limit: number = 10): Promise<any[]> {
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();
        if (!session) throw new Error("Unable to create database session.");
        
        const tokenService = new TokenService();
        
        try {
            const username = await tokenService.verifyAccessToken(token);
            
            const result = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(getRecentFarmReportsCypher, { username, farmName, limit })
            );
            
            return result.records.map(record => {
                const report = record.get('fr').properties;
                return {
                    id: report.id,
                    reportType: report.reportType,
                    startDate: report.startDate,
                    endDate: report.endDate,
                    daysAnalyzed: report.daysAnalyzed,
                    overallHealthScore: report.overallHealthScore,
                    overallHealthGrade: report.overallHealthGrade,
                    overallHealthTrend: report.overallHealthTrend,
                    createdAt: report.createdAt,
                    nextReportDate: report.nextReportDate,
                    keyInsights: report.keyInsights,
                    criticalActions: report.criticalActions
                };
            });
            
        } catch (error: any) {
            console.error("Error fetching farm reports:", error.message || error);
            throw new Error("Failed to fetch farm reports.");
        } finally {
            await session.close();
        }
    }

    /**
     * Get specific farm report by ID
     */
    public async getReportById(token: string, farmName: string, reportId: string): Promise<any> {
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();
        if (!session) throw new Error("Unable to create database session.");
        
        const tokenService = new TokenService();
        
        try {
            const username = await tokenService.verifyAccessToken(token);
            
            const result = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(getFarmReportByIdCypher, { username, farmName, reportId })
            );
            
            if (result.records.length === 0) {
                throw new Error("Farm report not found");
            }
            
            const report = result.records[0].get('fr').properties;
            
            // Parse the report content back to structured format
            return {
                ...report,
                reportContent: JSON.parse(report.reportContent)
            };
            
        } catch (error: any) {
            console.error("Error fetching farm report:", error.message || error);
            throw new Error("Failed to fetch farm report.");
        } finally {
            await session.close();
        }
    }

    /**
     * Calculate report period dates based on parameters
     */
    private calculateReportPeriod(params: FarmReportParams): { startDate: string; endDate: string; daysAnalyzed: number } {
        let startDate: Date;
        let endDate: Date;
        
        if (params.startDate && params.endDate) {
            // Custom date range
            startDate = new Date(params.startDate);
            endDate = new Date(params.endDate);
        } else {
            // Calculate based on report type
            endDate = new Date();
            const template = REPORT_TEMPLATES[params.reportType];
            const daysBack = template.daysPeriod || 30;
            startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
        }
        
        const daysAnalyzed = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        
        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            daysAnalyzed
        };
    }

    /**
     * Collect comprehensive farm data for the report period
     */
    private async collectFarmReportData(session: Session, username: string, farmName: string, reportPeriod: any): Promise<FarmReportData> {
        const result = await session.executeRead((tx: ManagedTransaction) =>
            tx.run(getFarmReportDataCypher, {
                username,
                farmName,
                startDate: reportPeriod.startDate,
                endDate: reportPeriod.endDate
            })
        );
        
        if (result.records.length === 0) {
            throw new Error("No farm data found for the specified period");
        }
        
        const record = result.records[0];
        
        // Get active crops
        const activeCropsResult = await session.executeRead((tx: ManagedTransaction) =>
            tx.run(getFarmActiveCropsCypher, {
                username,
                farmName,
                recentDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // Last 90 days
            })
        );
        
        const activeCrops = activeCropsResult.records.length > 0 
            ? activeCropsResult.records[0].get('activeCrops').filter((crop: string) => crop !== null)
            : [];
        
        return {
            farmInfo: {
                farmName: record.get('farmName'),
                totalArea: record.get('totalArea'),
                activeCrops: activeCrops
            },
            soilData: record.get('soilReadings').filter((reading: any) => reading.id !== null),
            plantData: record.get('plantScans').filter((scan: any) => scan.id !== null),
            pestData: record.get('pestReports').filter((report: any) => report.pestType !== null),
            yieldPredictions: record.get('yieldPredictions').filter((pred: any) => pred.id !== null),
            reportPeriod
        };
    }

    /**
     * Collect historical data for trend comparison
     */
    private async collectHistoricalData(session: Session, username: string, farmName: string, reportPeriod: any): Promise<any> {
        // Calculate historical period (same duration, preceding the current period)
        const currentPeriodDuration = new Date(reportPeriod.endDate).getTime() - new Date(reportPeriod.startDate).getTime();
        const historicalEndDate = new Date(reportPeriod.startDate);
        const historicalStartDate = new Date(historicalEndDate.getTime() - currentPeriodDuration);
        
        const result = await session.executeRead((tx: ManagedTransaction) =>
            tx.run(getHistoricalFarmDataCypher, {
                username,
                farmName,
                historicalStartDate: historicalStartDate.toISOString(),
                historicalEndDate: historicalEndDate.toISOString()
            })
        );
        
        if (result.records.length === 0) {
            return {
                historicalPlantScans: [],
                historicalSoilReadings: [],
                historicalPestReports: []
            };
        }
        
        const record = result.records[0];
        return {
            historicalPlantScans: record.get('historicalPlantScans').filter((scan: any) => scan.cropType !== null),
            historicalSoilReadings: record.get('historicalSoilReadings').filter((reading: any) => reading.fertility !== null),
            historicalPestReports: record.get('historicalPestReports').filter((report: any) => report.pestType !== null)
        };
    }

    /**
     * Get weather summary for the report period
     */
    private async getWeatherSummary(farmData: FarmReportData): Promise<any> {
        // This would integrate with weather service
        // For now, return basic structure
        return {
            averageTemperature: null,
            totalRainfall: null,
            favorableConditions: [],
            challenges: []
        };
    }

    /**
     * Generate AI-powered farm report
     */
    private async generateAIReport(farmData: FarmReportData, historicalData: any, params: FarmReportParams, reportPeriod: any, weatherData: any): Promise<FarmReportResult> {
        
        // Prepare comprehensive data context for AI
        const dataContext = this.prepareReportContext(farmData, historicalData, params);
        
        // Construct AI prompt
        const prompt = `${FARM_REPORT_PROMPT}

**FARM REPORT REQUEST:**

**Farm Information:**
- Farm: ${farmData.farmInfo.farmName}
- Report Type: ${params.reportType}
- Report Period: ${reportPeriod.startDate} to ${reportPeriod.endDate} (${reportPeriod.daysAnalyzed} days)
- Farm Size: ${farmData.farmInfo.totalArea || 'Not specified'} hectares
- Active Crops: ${farmData.farmInfo.activeCrops.join(', ') || 'Not specified'}

**DATA ANALYSIS:**
${dataContext}

**REPORT REQUIREMENTS:**
- Focus on ${REPORT_TEMPLATES[params.reportType].focusAreas.join(', ')}
- Generate actionable recommendations for ${params.reportType} planning
- Provide trend analysis comparing current vs historical data
- Include specific metrics and scores for each category

Generate a comprehensive farm report based on this data in the required JSON format.`;

        try {
            // Call OpenAI API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert agricultural consultant. Always respond with valid JSON that matches the required schema exactly."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            
            // Parse AI response
            let reportData;
            try {
                reportData = JSON.parse(aiResponse);
            } catch (parseError) {
                console.error("Failed to parse AI response:", aiResponse);
                throw new Error("Invalid AI response format");
            }
            
            // Construct final report
            const reportId = nanoid();
            const nextReportDate = this.calculateNextReportDate(params.reportType);
            
            const report: FarmReportResult = {
                farmName: farmData.farmInfo.farmName,
                reportType: params.reportType,
                reportPeriod: {
                    startDate: reportPeriod.startDate,
                    endDate: reportPeriod.endDate,
                    daysAnalyzed: reportPeriod.daysAnalyzed
                },
                executiveSummary: reportData.executiveSummary,
                detailedAnalysis: reportData.detailedAnalysis,
                trendAnalysis: reportData.trendAnalysis,
                recommendations: reportData.recommendations,
                dataQuality: {
                    soilReadings: farmData.soilData.length,
                    plantScans: farmData.plantData.length,
                    pestReports: farmData.pestData.length,
                    weatherDataPoints: 0, // Will be updated when weather integration is complete
                    completenessScore: reportData.dataQuality.completenessScore,
                    reliability: reportData.dataQuality.reliability
                },
                nextReportDate,
                generatedAt: new Date().toISOString(),
                reportId
            };
            
            return report;
            
        } catch (error) {
            console.error("Error calling AI for farm report:", error);
            
            // Fallback report generation
            return this.generateFallbackReport(farmData, params, reportPeriod);
        }
    }

    /**
     * Prepare data context summary for AI analysis
     */
    private prepareReportContext(farmData: FarmReportData, historicalData: any, params: FarmReportParams): string {
        let context = "";
        
        // Soil health summary
        context += `**Soil Health Data (${farmData.soilData.length} readings):**\n`;
        if (farmData.soilData.length > 0) {
            const avgPH = farmData.soilData.reduce((sum, r) => sum + (r.ph || 0), 0) / farmData.soilData.length;
            const avgMoisture = farmData.soilData.reduce((sum, r) => sum + (r.moisture || 0), 0) / farmData.soilData.length;
            const avgFertility = farmData.soilData.reduce((sum, r) => sum + (r.fertility || 0), 0) / farmData.soilData.length;
            
            context += `- Average pH: ${avgPH.toFixed(2)}\n`;
            context += `- Average Moisture: ${avgMoisture.toFixed(1)}%\n`;
            context += `- Average Fertility: ${avgFertility.toFixed(0)} µS/cm\n`;
            
            const recentReadings = farmData.soilData.slice(0, 3);
            recentReadings.forEach((reading, index) => {
                context += `- Reading ${index + 1}: pH ${reading.ph}, Moisture ${reading.moisture}%, Fertility ${reading.fertility}\n`;
                if (reading.interpretation) context += `  Analysis: ${reading.interpretation}\n`;
            });
        } else {
            context += "- No soil readings available for this period\n";
        }
        
        // Plant health summary  
        context += `\n**Plant Health Data (${farmData.plantData.length} scans):**\n`;
        if (farmData.plantData.length > 0) {
            const cropGroups = farmData.plantData.reduce((groups: any, scan) => {
                if (!groups[scan.cropType]) groups[scan.cropType] = [];
                groups[scan.cropType].push(scan);
                return groups;
            }, {});
            
            Object.entries(cropGroups).forEach(([crop, scans]: [string, any]) => {
                context += `- ${crop}: ${scans.length} scans\n`;
                const recentScan = scans[0];
                if (recentScan.interpretation) {
                    context += `  Latest: ${recentScan.interpretation}\n`;
                }
            });
        } else {
            context += "- No plant scans available for this period\n";
        }
        
        // Pest pressure summary
        context += `\n**Pest Management (${farmData.pestData.length} reports):**\n`;
        if (farmData.pestData.length > 0) {
            const pestTypesSet = new Set(farmData.pestData.map(r => r.pestType));
            const pestTypes = Array.from(pestTypesSet);
            const avgSeverity = farmData.pestData.reduce((sum, r) => sum + r.severityLevel, 0) / farmData.pestData.length;
            
            context += `- Pest Types: ${pestTypes.join(', ')}\n`;
            context += `- Average Severity: ${avgSeverity.toFixed(1)}/5\n`;
            
            farmData.pestData.slice(0, 3).forEach((report, index) => {
                context += `- Report ${index + 1}: ${report.pestType} (${report.cropAffected}, Severity: ${report.severityLevel})\n`;
            });
        } else {
            context += "- No pest reports for this period\n";
        }
        
        // Historical comparison
        context += `\n**Historical Comparison:**\n`;
        context += `- Previous period soil readings: ${historicalData.historicalSoilReadings.length}\n`;
        context += `- Previous period plant scans: ${historicalData.historicalPlantScans.length}\n`;
        context += `- Previous period pest reports: ${historicalData.historicalPestReports.length}\n`;
        
        // Yield predictions
        if (farmData.yieldPredictions && farmData.yieldPredictions.length > 0) {
            context += `\n**Yield Predictions (${farmData.yieldPredictions.length} predictions):**\n`;
            farmData.yieldPredictions.forEach((pred, index) => {
                context += `- ${pred.cropType}: ${pred.predictedAmount} ${pred.yieldUnit} (${pred.confidence}% confidence)\n`;
            });
        }
        
        return context;
    }

    /**
     * Generate fallback report when AI fails
     */
    private generateFallbackReport(farmData: FarmReportData, params: FarmReportParams, reportPeriod: any): FarmReportResult {
        const reportId = nanoid();
        
        // Basic health scoring
        let overallScore = 70; // Default
        if (farmData.soilData.length === 0) overallScore -= 20;
        if (farmData.plantData.length === 0) overallScore -= 20;
        if (farmData.pestData.length > 5) overallScore -= 10;
        
        const grade = overallScore >= 90 ? "Excellent" : overallScore >= 75 ? "Good" : overallScore >= 60 ? "Fair" : "Poor";
        
        return {
            farmName: farmData.farmInfo.farmName,
            reportType: params.reportType,
            reportPeriod: {
                startDate: reportPeriod.startDate,
                endDate: reportPeriod.endDate,
                daysAnalyzed: reportPeriod.daysAnalyzed
            },
            executiveSummary: {
                overallFarmHealth: {
                    score: overallScore,
                    grade: grade as any,
                    trend: "Stable"
                },
                keyInsights: ["Limited data available for comprehensive analysis"],
                criticalActions: ["Increase data collection frequency"],
                opportunities: ["Implement more monitoring systems"]
            },
            detailedAnalysis: {
                soilHealth: {
                    averageScore: 70,
                    trends: ["Stable conditions"],
                    recommendations: ["Continue monitoring"],
                    criticalIssues: [],
                    dataPoints: farmData.soilData.length
                },
                plantHealth: {
                    averageScore: 75,
                    trends: ["Normal growth patterns"],
                    diseases: [],
                    recommendations: ["Regular health checks"],
                    cropPerformance: farmData.farmInfo.activeCrops.map(crop => ({
                        cropType: crop,
                        healthScore: 75,
                        scansAnalyzed: 0,
                        trend: "Stable"
                    })),
                    dataPoints: farmData.plantData.length
                },
                pestManagement: {
                    threatLevel: "Low" as const,
                    activePests: [],
                    treatmentEffectiveness: [],
                    preventiveActions: ["Continue monitoring"],
                    incidentCount: farmData.pestData.length
                },
                weatherImpact: {
                    favorableConditions: ["Normal seasonal weather"],
                    challenges: [],
                    recommendations: ["Monitor weather forecasts"],
                    weatherScore: 80
                }
            },
            trendAnalysis: {
                soilTrends: [],
                plantHealthTrends: [],
                pestTrends: {
                    incidentFrequency: "Stable",
                    newThreats: [],
                    managementEffectiveness: "Good"
                }
            },
            recommendations: {
                immediate: ["Continue current management practices"],
                shortTerm: ["Increase monitoring frequency"],
                longTerm: ["Consider investing in more sensors"],
                investment: ["Automated monitoring systems"]
            },
            dataQuality: {
                soilReadings: farmData.soilData.length,
                plantScans: farmData.plantData.length,
                pestReports: farmData.pestData.length,
                weatherDataPoints: 0,
                completenessScore: 50,
                reliability: "Medium"
            },
            nextReportDate: this.calculateNextReportDate(params.reportType),
            generatedAt: new Date().toISOString(),
            reportId
        };
    }

    /**
     * Calculate next report date based on report type
     */
    private calculateNextReportDate(reportType: string): string {
        const now = new Date();
        const template = REPORT_TEMPLATES[reportType as keyof typeof REPORT_TEMPLATES];
        const daysToAdd = template.daysPeriod || 30;
        
        const nextDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        return nextDate.toISOString();
    }

    /**
     * Save farm report to database
     */
    private async saveReport(session: Session, username: string, farmName: string, report: FarmReportResult): Promise<void> {
        await session.executeWrite((tx: ManagedTransaction) =>
            tx.run(saveFarmReportCypher, {
                username,
                farmName,
                reportId: report.reportId,
                reportType: report.reportType,
                startDate: report.reportPeriod.startDate,
                endDate: report.reportPeriod.endDate,
                daysAnalyzed: report.reportPeriod.daysAnalyzed,
                overallHealthScore: report.executiveSummary.overallFarmHealth.score,
                overallHealthGrade: report.executiveSummary.overallFarmHealth.grade,
                overallHealthTrend: report.executiveSummary.overallFarmHealth.trend,
                soilHealthScore: report.detailedAnalysis.soilHealth.averageScore,
                plantHealthScore: report.detailedAnalysis.plantHealth.averageScore,
                pestThreatLevel: report.detailedAnalysis.pestManagement.threatLevel,
                weatherScore: report.detailedAnalysis.weatherImpact.weatherScore,
                dataCompletenessScore: report.dataQuality.completenessScore,
                dataReliability: report.dataQuality.reliability,
                keyInsights: report.executiveSummary.keyInsights,
                criticalActions: report.executiveSummary.criticalActions,
                opportunities: report.executiveSummary.opportunities,
                immediateActions: report.recommendations.immediate,
                shortTermActions: report.recommendations.shortTerm,
                longTermActions: report.recommendations.longTerm,
                investmentActions: report.recommendations.investment,
                nextReportDate: report.nextReportDate,
                createdAt: report.generatedAt,
                reportContent: JSON.stringify(report) // Store full report as JSON
            })
        );
        
        console.log(`Farm report saved with ID: ${report.reportId}`);
    }
}

export default FarmReportService;
