//** ELYSIA IMPORT */
import Elysia from 'elysia';

//** SERVICE IMPORTS */
import { cropPlanningAITeam } from '../ai.services/crop.planning.service/crop.planning.main';
import type { CropPlanningRequest } from "../ai.services/crop.planning.service/crop.planning.interface";

//** SCHEMA IMPORTS */
import { t } from "elysia";
import { 
    CropPlanningRequestSchema, 
    CropPerformanceAnalysisRequestSchema, 
    SeasonalRecommendationsRequestSchema, 
    cropPlanningSchema,
    performanceAnalysisSchema,
    seasonalRecommendationsSchema
} from '../ai.services/crop.planning.service/crop.planning.schema';



const CropPlanning = (app: Elysia) => {
    //** GENERATE CROP PLAN ENDPOINT */
    app.post("/api/generate-crop-plan", async ({ body, headers }) => {
        try {
            console.log('📊 Generating crop plan request:', body);

            const jwtToken = headers.authorization?.replace('Bearer ', '');
            if (!jwtToken) {
                throw new Error('Authorization token required');
            }

            const requestData = body as CropPlanningRequest;

            // Generate comprehensive crop plan
            const cropPlan = await cropPlanningAITeam.generateOptimalCropPlan(requestData);

            console.log(`✅ Crop plan generated successfully for ${requestData.farmName}`);

            return {
                success: true,
                data: cropPlan,
                message: `Comprehensive crop plan generated for ${requestData.farmName}`,
                timestamp: new Date().toISOString()
            };

        } catch (error: any) {
            console.error('❌ Crop planning failed:', error);
            return {
                success: false,
                error: error.message || 'Crop planning failed',
                timestamp: new Date().toISOString()
            };
        }
    }, cropPlanningSchema);

    //** ANALYZE CROP PERFORMANCE ENDPOINT */
    app.post("/api/analyze-crop-performance", async ({ body, headers }) => {
        try {
            console.log('📈 Analyzing crop performance:', body);

            const jwtToken = headers.authorization?.replace('Bearer ', '');
            if (!jwtToken) {
                throw new Error('Authorization token required');
            }

            const requestData = body as { farmId: string; cropType: string; season: string; year: number };

            // Analyze historical performance
            const analysis = await cropPlanningAITeam.analyzeCropPerformance(requestData.farmId, requestData.cropType);

            console.log(`✅ Performance analysis completed for ${requestData.farmId} - ${requestData.cropType}`);

            return {
                success: true,
                data: analysis,
                message: `Performance analysis completed for ${requestData.farmId} - ${requestData.cropType}`,
                timestamp: new Date().toISOString()
            };

        } catch (error: any) {
            console.error('❌ Performance analysis failed:', error);
            return {
                success: false,
                error: error.message || 'Performance analysis failed',
                timestamp: new Date().toISOString()
            };
        }
    }, performanceAnalysisSchema);

    //** SEASONAL RECOMMENDATIONS ENDPOINT */
    app.post("/api/seasonal-recommendations", async ({ body, headers }) => {
        try {
            console.log('🌱 Getting seasonal recommendations:', body);

            const jwtToken = headers.authorization?.replace('Bearer ', '');
            if (!jwtToken) {
                throw new Error('Authorization token required');
            }

            const requestData = body as { farmId: string; location: { lat: number; lng: number }; currentSeason: string; farmSize: number };

            // Get seasonal recommendations  
            const recommendations = await cropPlanningAITeam.getSeasonalRecommendations(requestData.location, requestData.currentSeason);

            console.log(`✅ Seasonal recommendations generated for ${requestData.currentSeason}`);

            return {
                success: true,
                data: recommendations,
                message: `Seasonal recommendations generated for ${requestData.currentSeason}`,
                timestamp: new Date().toISOString()
            };

        } catch (error: any) {
            console.error('❌ Seasonal recommendations failed:', error);
            return {
                success: false,
                error: error.message || 'Seasonal recommendations failed',
                timestamp: new Date().toISOString()
            };
        }
    }, seasonalRecommendationsSchema);
}

export default CropPlanning;