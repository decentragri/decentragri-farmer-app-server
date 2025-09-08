//** MEMGRAPH DRIVER AND TYPES */
import { Driver, ManagedTransaction, Session } from "neo4j-driver";
import { getDriver } from "../../db/memgraph";

//** SERVICES */
import TokenService from "../../security.services/token.service";
import WeatherService from "../../weather.services/weather.service";

//** INTERFACES */
import type { YieldPredictionParams, YieldPredictionResult, YieldHistoryData } from "./yield.interface";

//** CYPHER QUERIES */
import { 
    getYieldPredictionDataCypher, 
    saveYieldPredictionCypher,
    getRecentYieldPredictionsCypher
} from "./yield.cypher";

//** AI SCHEMA */
import { YIELD_PREDICTION_PROMPT, CROP_YIELD_STANDARDS } from "./yield.schema";

//** EXTERNAL APIs */
import { nanoid } from "nanoid";

class YieldPredictionService {

    /**
     * Generate crop yield prediction using AI analysis
     * @param token - JWT authentication token
     * @param params - YieldPredictionParams
     * @returns YieldPredictionResult
     */
    public async predictYield(token: string, params: YieldPredictionParams): Promise<YieldPredictionResult> {
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();
        if (!session) throw new Error("Unable to create database session.");
        
        const tokenService = new TokenService();
        
        try {
            const username = await tokenService.verifyAccessToken(token);
            console.log(`Generating yield prediction for ${params.cropType} at ${params.farmName}`);
            
            // Collect historical farm data
            const farmData = await this.collectFarmData(session, username, params);
            
            // Get weather data if location available
            let weatherData = null;
            if (farmData.soilReadings.length > 0) {
                try {
                    const weatherService = new WeatherService();
                    // Use first soil reading location as farm location
                    const sampleReading = farmData.soilReadings[0];
                    // Note: You might want to store farm coordinates separately
                    // For now, we'll skip weather if no coordinates available
                } catch (error) {
                    console.warn("Could not fetch weather data:", error);
                }
            }
            
            // Generate AI prediction
            const prediction = await this.generateAIPrediction(farmData, params, weatherData);
            
            // Save prediction to database
            await this.savePrediction(session, username, params, prediction);
            
            return prediction;
            
        } catch (error: any) {
            console.error("Error generating yield prediction:", error.message || error);
            throw new Error("Failed to generate yield prediction.");
        } finally {
            await session.close();
        }
    }

    /**
     * Get recent yield predictions for a farm and crop
     */
    public async getRecentPredictions(token: string, farmName: string, cropType: string, limit: number = 5): Promise<any[]> {
        const driver: Driver = getDriver();
        const session: Session | undefined = driver?.session();
        if (!session) throw new Error("Unable to create database session.");
        
        const tokenService = new TokenService();
        
        try {
            const username = await tokenService.verifyAccessToken(token);
            
            const result = await session.executeRead((tx: ManagedTransaction) =>
                tx.run(getRecentYieldPredictionsCypher, { username, farmName, cropType, limit })
            );
            
            return result.records.map(record => {
                const prediction = record.get('yp').properties;
                return {
                    id: prediction.id,
                    cropType: prediction.cropType,
                    predictedAmount: prediction.predictedAmount,
                    yieldUnit: prediction.yieldUnit,
                    confidence: prediction.confidence,
                    qualityGrade: prediction.qualityGrade,
                    qualityScore: prediction.qualityScore,
                    riskLevel: prediction.riskLevel,
                    overallConfidence: prediction.overallConfidence,
                    dataQuality: prediction.dataQuality,
                    optimalHarvestDate: prediction.optimalHarvestDate,
                    createdAt: prediction.createdAt,
                    recommendations: prediction.recommendations,
                    riskFactors: prediction.riskFactors
                };
            });
            
        } catch (error: any) {
            console.error("Error fetching yield predictions:", error.message || error);
            throw new Error("Failed to fetch yield predictions.");
        } finally {
            await session.close();
        }
    }

    /**
     * Collect comprehensive farm data for yield prediction
     */
    private async collectFarmData(session: Session, username: string, params: YieldPredictionParams): Promise<YieldHistoryData> {
        // Calculate start date (6 months ago or planting date)
        const startDate = params.plantingDate || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const result = await session.executeRead((tx: ManagedTransaction) =>
            tx.run(getYieldPredictionDataCypher, {
                username,
                farmName: params.farmName,
                cropType: params.cropType,
                startDate
            })
        );
        
        if (result.records.length === 0) {
            return {
                plantScans: [],
                soilReadings: [],
                pestReports: [],
                farmSize: params.farmSize,
                plantingDate: params.plantingDate,
                expectedHarvestDate: params.expectedHarvestDate
            };
        }
        
        const record = result.records[0];
        return {
            plantScans: record.get('plantScans').filter((scan: any) => scan.id !== null),
            soilReadings: record.get('soilReadings').filter((reading: any) => reading.id !== null),
            pestReports: record.get('pestReports').filter((report: any) => report.pestType !== null),
            farmSize: params.farmSize,
            plantingDate: params.plantingDate,
            expectedHarvestDate: params.expectedHarvestDate
        };
    }

    /**
     * Generate AI-powered yield prediction
     */
    private async generateAIPrediction(farmData: YieldHistoryData, params: YieldPredictionParams, weatherData: any): Promise<YieldPredictionResult> {
        
        // Get crop standards for baseline calculations
        const cropStandards = CROP_YIELD_STANDARDS[params.cropType.toLowerCase() as keyof typeof CROP_YIELD_STANDARDS];
        const baseYield = cropStandards?.avgYieldPerHectare || 1000;
        const yieldUnit = cropStandards?.unit || "kg";
        
        // Prepare data summary for AI
        const dataContext = this.prepareDataContext(farmData, params);
        
        // Construct AI prompt
        const prompt = `${YIELD_PREDICTION_PROMPT}

        **FARM DATA ANALYSIS:**

        **Farm Information:**
        - Farm: ${params.farmName}
        - Crop Type: ${params.cropType}
        - Farm Size: ${params.farmSize || 'Not specified'} hectares
        - Planting Date: ${params.plantingDate || 'Not specified'}
        - Expected Harvest: ${params.expectedHarvestDate || 'Not specified'}

        **Historical Data Summary:**
        ${dataContext}

        **Baseline Yield Standards for ${params.cropType}:**
        - Average: ${baseYield} ${yieldUnit}/hectare
        - Premium: ${cropStandards?.premium || baseYield * 1.2} ${yieldUnit}/hectare
        - Below Average: ${cropStandards?.belowAverage || baseYield * 0.8} ${yieldUnit}/hectare

        Calculate the yield prediction based on this data and provide your analysis in the required JSON format.`;

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
                            content: "You are an expert agricultural AI specializing in crop yield prediction. Always respond with valid JSON."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            
            // Parse AI response
            let predictionData;
            try {
                predictionData = JSON.parse(aiResponse);
            } catch (parseError) {
                console.error("Failed to parse AI response:", aiResponse);
                throw new Error("Invalid AI response format");
            }
            
            // Construct final result
            const result: YieldPredictionResult = {
                cropType: params.cropType,
                farmName: params.farmName,
                predictedYield: predictionData.predictedYield,
                yieldQuality: predictionData.yieldQuality,
                factors: predictionData.factors,
                recommendations: predictionData.recommendations,
                risks: predictionData.risks,
                confidence: predictionData.confidence,
                generatedAt: new Date().toISOString(),
                harvestWindow: predictionData.harvestWindow
            };
            
            return result;
            
        } catch (error) {
            console.error("Error calling AI for yield prediction:", error);
            
            // Fallback prediction based on data analysis
            return this.generateFallbackPrediction(farmData, params, baseYield, yieldUnit);
        }
    }

    /**
     * Prepare data context summary for AI analysis
     */
    private prepareDataContext(farmData: YieldHistoryData, params: YieldPredictionParams): string {
        let context = "";
        
        // Plant health summary
        context += `**Plant Health Data (${farmData.plantScans.length} scans):**\n`;
        if (farmData.plantScans.length > 0) {
            const recentScans = farmData.plantScans.slice(0, 5);
            recentScans.forEach((scan, index) => {
                context += `- Scan ${index + 1}: ${scan.date} - ${scan.interpretation || 'No interpretation'}\n`;
                if (scan.note) context += `  Notes: ${scan.note}\n`;
            });
        } else {
            context += "- No plant scan data available\n";
        }
        
        // Soil health summary  
        context += `\n**Soil Health Data (${farmData.soilReadings.length} readings):**\n`;
        if (farmData.soilReadings.length > 0) {
            const recentReadings = farmData.soilReadings.slice(0, 5);
            recentReadings.forEach((reading, index) => {
                context += `- Reading ${index + 1}: ${reading.createdAt}\n`;
                context += `  Fertility: ${reading.fertility} µS/cm, pH: ${reading.ph}, Moisture: ${reading.moisture}%\n`;
                context += `  Temperature: ${reading.temperature}°C, Sunlight: ${reading.sunlight} lux\n`;
                if (reading.interpretation) context += `  Analysis: ${reading.interpretation}\n`;
            });
        } else {
            context += "- No soil reading data available\n";
        }
        
        // Pest pressure summary
        context += `\n**Pest & Disease Pressure (${farmData.pestReports.length} reports):**\n`;
        if (farmData.pestReports.length > 0) {
            const recentReports = farmData.pestReports.slice(0, 5);
            recentReports.forEach((report, index) => {
                context += `- Report ${index + 1}: ${report.dateTime} - ${report.pestType} (Severity: ${report.severityLevel})\n`;
            });
        } else {
            context += "- No pest reports recorded\n";
        }
        
        return context;
    }

    /**
     * Generate fallback prediction when AI fails
     */
    private generateFallbackPrediction(farmData: YieldHistoryData, params: YieldPredictionParams, baseYield: number, yieldUnit: string): YieldPredictionResult {
        // Simple rule-based prediction
        let yieldMultiplier = 1.0;
        
        // Adjust based on data availability and quality
        if (farmData.plantScans.length === 0) yieldMultiplier -= 0.1;
        if (farmData.soilReadings.length === 0) yieldMultiplier -= 0.15;
        if (farmData.pestReports.length > 3) yieldMultiplier -= 0.1;
        
        const predictedAmount = Math.round(baseYield * yieldMultiplier * (params.farmSize || 1));
        
        return {
            cropType: params.cropType,
            farmName: params.farmName,
            predictedYield: {
                amount: predictedAmount,
                unit: yieldUnit,
                confidence: 50
            },
            yieldQuality: {
                grade: "Standard",
                qualityScore: 70
            },
            factors: {
                soilHealth: { score: 70, impact: "Moderate", trends: ["Stable"] },
                plantHealth: { score: 75, impact: "Good", diseases: [], trends: ["Stable"] },
                weatherConditions: { score: 80, impact: "Favorable", favorableFactors: ["Normal season"], riskFactors: [] },
                pestPressure: { score: 85, impact: "Low", threats: [] }
            },
            recommendations: ["Monitor crop development closely", "Continue regular maintenance"],
            risks: {
                level: "Medium" as const,
                factors: ["Limited historical data"],
                mitigation: ["Increase monitoring frequency", "Collect more data points"]
            },
            confidence: {
                overall: 50,
                dataQuality: "Limited"
            },
            generatedAt: new Date().toISOString(),
            harvestWindow: {
                optimal: params.expectedHarvestDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                earliest: params.expectedHarvestDate || new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
                latest: params.expectedHarvestDate || new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString()
            }
        };
    }

    /**
     * Save yield prediction to database
     */
    private async savePrediction(session: Session, username: string, params: YieldPredictionParams, prediction: YieldPredictionResult): Promise<void> {
        const predictionId = nanoid();
        
        await session.executeWrite((tx: ManagedTransaction) =>
            tx.run(saveYieldPredictionCypher, {
                username,
                farmName: params.farmName,
                predictionId,
                cropType: params.cropType,
                predictedAmount: prediction.predictedYield.amount,
                yieldUnit: prediction.predictedYield.unit,
                confidence: prediction.predictedYield.confidence,
                qualityGrade: prediction.yieldQuality.grade,
                qualityScore: prediction.yieldQuality.qualityScore,
                soilHealthScore: prediction.factors.soilHealth.score,
                plantHealthScore: prediction.factors.plantHealth.score,
                weatherScore: prediction.factors.weatherConditions.score,
                pestPressureScore: prediction.factors.pestPressure.score,
                riskLevel: prediction.risks.level,
                overallConfidence: prediction.confidence.overall,
                dataQuality: prediction.confidence.dataQuality,
                optimalHarvestDate: prediction.harvestWindow.optimal,
                earliestHarvestDate: prediction.harvestWindow.earliest,
                latestHarvestDate: prediction.harvestWindow.latest,
                recommendations: prediction.recommendations,
                riskFactors: prediction.risks.factors,
                mitigationActions: prediction.risks.mitigation,
                createdAt: prediction.generatedAt,
                farmSize: params.farmSize || 1,
                plantingDate: params.plantingDate || new Date().toISOString()
            })
        );
        
        console.log(`Yield prediction saved with ID: ${predictionId}`);
    }
}

export default YieldPredictionService;
