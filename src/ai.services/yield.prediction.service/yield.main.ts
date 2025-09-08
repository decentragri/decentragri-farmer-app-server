import YieldPredictionService from "./yield.service";
import type { YieldPredictionParams, YieldPredictionResult } from "./yield.interface";
import type { SuccessMessage } from "../../onchain.services/onchain.interface";

class YieldPredictionRunner {
    /**
     * Generate crop yield prediction based on historical farm data
     * @param token - JWT authentication token
     * @param params - YieldPredictionParams containing farm and crop info
     * @returns Promise<SuccessMessage> with prediction result
     */
    public static async generatePrediction(token: string, params: YieldPredictionParams): Promise<SuccessMessage> {
        try {
            console.log(`Starting yield prediction for ${params.cropType} at ${params.farmName}`);
            
            const service = new YieldPredictionService();
            const prediction: YieldPredictionResult = await service.predictYield(token, params);
            
            console.log(`Yield prediction completed successfully. Predicted yield: ${prediction.predictedYield.amount} ${prediction.predictedYield.unit}`);
            
            return {
                success: "Yield prediction generated successfully",
                prediction: prediction
            } as SuccessMessage & { prediction: YieldPredictionResult };
            
        } catch (error: any) {
            console.error("Error in yield prediction runner:", error.message || error);
            return {
                error: `Failed to generate yield prediction: ${error.message || "Unknown error"}`
            };
        }
    }

    /**
     * Get recent yield predictions for a farm and crop
     * @param token - JWT authentication token
     * @param farmName - Name of the farm
     * @param cropType - Type of crop
     * @param limit - Number of predictions to retrieve
     * @returns Promise<SuccessMessage> with predictions list
     */
    public static async getRecentPredictions(token: string, farmName: string, cropType: string, limit: number = 5): Promise<SuccessMessage> {
        try {
            console.log(`Fetching recent yield predictions for ${cropType} at ${farmName}`);
            
            const service = new YieldPredictionService();
            const predictions = await service.getRecentPredictions(token, farmName, cropType, limit);
            
            return {
                success: "Recent yield predictions retrieved successfully",
                predictions: predictions
            } as SuccessMessage & { predictions: any[] };
            
        } catch (error: any) {
            console.error("Error fetching yield predictions:", error.message || error);
            return {
                error: `Failed to fetch yield predictions: ${error.message || "Unknown error"}`
            };
        }
    }
}

export default YieldPredictionRunner;
