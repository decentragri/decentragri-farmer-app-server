import OpenAI from 'openai';
import type { CropPlanningRequest, CropPlanningResponse } from './crop.planning.interface';
import { CropPlanningService } from './crop.planning.service';
import { getDriver } from '../../db/memgraph';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class CropPlanningAITeam {
  private cropPlanningService: CropPlanningService;

  constructor() {
    this.cropPlanningService = new CropPlanningService(getDriver());
  }

  async generateOptimalCropPlan(request: CropPlanningRequest): Promise<CropPlanningResponse> {
    try {
      console.log(`🌾 Starting AI crop planning for ${request.farmName} - ${request.cropType}`);

      // Generate comprehensive crop plan with AI analysis
      const cropPlan = await this.cropPlanningService.generateCropPlan(request);

      // Enhance with advanced AI insights
      const enhancedPlan = await this.enhanceWithAIInsights(cropPlan, request);

      console.log(`✅ Crop planning completed with ${enhancedPlan.confidence}% confidence`);
      return enhancedPlan;

    } catch (error) {
      console.error('❌ Crop planning failed:', error);
      throw new Error(`Crop planning analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async enhanceWithAIInsights(
    cropPlan: CropPlanningResponse, 
    request: CropPlanningRequest
  ): Promise<CropPlanningResponse> {
    try {
      const aiPrompt = this.buildEnhancementPrompt(cropPlan, request);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert agricultural AI consultant with deep knowledge in:
            - Crop science and agronomy
            - Market analysis and price forecasting
            - Weather pattern analysis and climate science
            - Precision agriculture and farm optimization
            - Risk management and agricultural economics
            
            Provide detailed, actionable insights that help farmers maximize profitability while maintaining sustainability.`
          },
          {
            role: "user",
            content: aiPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiInsights = completion.choices[0]?.message?.content;
      
      if (aiInsights) {
        return {
          ...cropPlan,
          aiInsights: aiInsights,
          confidence: Math.min(cropPlan.confidence + 5, 95), // Boost confidence with AI enhancement
        };
      }

      return cropPlan;

    } catch (error) {
      console.error('AI enhancement failed, using original plan:', error);
      return cropPlan;
    }
  }

  private buildEnhancementPrompt(cropPlan: CropPlanningResponse, request: CropPlanningRequest): string {
    return `
    Analyze this comprehensive crop planning analysis and provide enhanced insights:

    FARM PROFILE:
    - Farm: ${cropPlan.farmName}
    - Crop: ${cropPlan.cropType}
    - Size: ${request.farmSize} hectares
    - Location: ${request.location.lat}, ${request.location.lng}
    - Planning Date: ${cropPlan.planningDate}

    CURRENT RECOMMENDATIONS:
    
    Planting Plan:
    - Optimal window: ${cropPlan.plantingPlan.optimalStart} to ${cropPlan.plantingPlan.optimalEnd}
    - Confidence: ${cropPlan.plantingPlan.confidence}%
    - Reasoning: ${cropPlan.plantingPlan.reasoning}

    Harvest Projections:
    - Optimal harvest: ${cropPlan.harvestPlan.optimalStart} to ${cropPlan.harvestPlan.optimalEnd}
    - Expected yield: ${cropPlan.harvestPlan.estimatedYield} units
    - Market price: $${cropPlan.harvestPlan.marketWindow.expectedPrice}
    - Confidence: ${cropPlan.harvestPlan.confidence}%

    Financial Analysis:
    - Total costs: $${cropPlan.costAnalysis.total}
    - Gross revenue: $${cropPlan.revenueProjection.grossRevenue}
    - Net profit: $${cropPlan.revenueProjection.netProfit}
    - Profit margin: ${cropPlan.revenueProjection.profitMargin}%

    Risk Assessment:
    - Overall risk: ${cropPlan.riskAssessment.overallRisk}
    - Weather risks: ${cropPlan.riskAssessment.weatherRisks.join(', ')}
    - Market risks: ${cropPlan.riskAssessment.marketRisks.join(', ')}

    Weather Factors:
    - Average temperature: ${cropPlan.weatherFactors.averageTemperature}°C
    - Rainfall: ${cropPlan.weatherFactors.rainfall}mm
    - Frost risk: ${cropPlan.weatherFactors.frostRisk}%
    - Drought risk: ${cropPlan.weatherFactors.droughtRisk}%

    Market Analysis:
    - Current price: $${cropPlan.marketAnalysis.currentPrice}
    - Price trend: ${cropPlan.marketAnalysis.priceTrend}
    - Demand forecast: ${cropPlan.marketAnalysis.demandForecast}

    ENHANCEMENT REQUEST:
    Please provide detailed insights on:

    1. **Optimization Opportunities**: What specific adjustments could improve profitability or reduce risk?

    2. **Market Timing Strategy**: Given the price trends and seasonality, what's the optimal market entry strategy?

    3. **Climate Adaptation**: How should the farmer adapt to the weather forecast and climate conditions?

    4. **Technology Integration**: What precision agriculture technologies would be most beneficial?

    5. **Sustainability Considerations**: How can this plan be optimized for long-term soil health and environmental sustainability?

    6. **Risk Mitigation**: What additional strategies should be considered to minimize identified risks?

    7. **Performance Monitoring**: What key metrics should the farmer track to ensure plan success?

    Provide specific, actionable recommendations with reasoning. Focus on practical implementation steps.
    `;
  }

  async analyzeCropPerformance(farmName: string, cropType: string): Promise<any> {
    try {
      // Fetch historical performance data
      const session = getDriver().session();
      
      const result = await session.run(`
        MATCH (f:Farm {name: $farmName})
        MATCH (f)-[:HAS_PLAN]->(cp:CropPlan {cropType: $cropType})
        OPTIONAL MATCH (f)-[:HAS_HARVEST]->(h:HarvestRecord {cropType: $cropType})
        
        RETURN 
          cp.estimatedYield as plannedYield,
          h.actualYield as actualYield,
          cp.netProfit as plannedProfit,
          h.actualProfit as actualProfit,
          cp.confidence as planConfidence,
          cp.createdAt as planDate,
          h.harvestDate as harvestDate
        
        ORDER BY cp.createdAt DESC
        LIMIT 10
      `, { farmName, cropType });

      await session.close();

      const performanceData = result.records.map((record: any) => ({
        plannedYield: record.get('plannedYield'),
        actualYield: record.get('actualYield'),
        plannedProfit: record.get('plannedProfit'),
        actualProfit: record.get('actualProfit'),
        planConfidence: record.get('planConfidence'),
        planDate: record.get('planDate'),
        harvestDate: record.get('harvestDate')
      }));

      // AI analysis of performance patterns
      const performancePrompt = `
      Analyze this crop planning performance data for ${farmName} - ${cropType}:
      
      ${JSON.stringify(performanceData, null, 2)}
      
      Provide insights on:
      1. Planning accuracy trends
      2. Areas for improvement
      3. Success factors
      4. Recommendations for future planning
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an agricultural performance analyst. Analyze planning vs actual results to provide actionable insights."
          },
          {
            role: "user",
            content: performancePrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      return {
        performanceData,
        analysis: completion.choices[0]?.message?.content || "Analysis unavailable",
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Performance analysis failed:', error);
      throw new Error(`Performance analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSeasonalRecommendations(location: { lat: number; lng: number }, cropType: string): Promise<any> {
    try {
      const seasonalPrompt = `
      Provide seasonal crop planning recommendations for:
      - Location: ${location.lat}, ${location.lng}
      - Crop: ${cropType}
      - Current date: ${new Date().toISOString()}
      
      Include:
      1. Current season activities
      2. Upcoming season preparation
      3. Long-term planning considerations
      4. Regional best practices
      5. Climate-specific adaptations
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a seasonal agriculture expert providing location and crop-specific guidance."
          },
          {
            role: "user",
            content: seasonalPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      return {
        recommendations: completion.choices[0]?.message?.content || "Recommendations unavailable",
        location,
        cropType,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Seasonal recommendations failed:', error);
      throw new Error(`Seasonal recommendations failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const cropPlanningAITeam = new CropPlanningAITeam();
