//**CLASS IMPORTS */
import PlantImageTeam from './plant.ai.team';
import TokenService from '../../security.services/token.service';
import PlantData from '../../plant.services/plantscan.service';
import { notificationService } from '../../notification.services/notification.service';

//**TYPE IMPORTS */
import type { SuccessMessage } from '../../onchain.services/onchain.interface';
import type { AnalysisResult, PlantImageSessionParams } from "./plant.interface";
import type { ParsedInterpretation } from "../../plant.services/plantscan.interface";
import { NotificationType } from '../../notification.services/notification.interface';
import RewardsService from '../../rewards.services/rewards.service';

class PlantImageRunner {
    private tokenService = new TokenService();
    private plantImageTeam = new PlantImageTeam();
    private plantData = new PlantData();

    /**
     * Format the analysis result into a readable string
     * @param result - The analysis result object
     * @returns Formatted string interpretation
     */
    private formatAnalysisResult(result: AnalysisResult): string {
        return `Diagnosis: ${result.Diagnosis}\n` +
            `Reason: ${result.Reason}\n\n` +
            'Recommendations:\n' +
            result.Recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n');
    }

    /**
     * Handle the analysis result and save the plant scan
     * @param output - The output from the plant image team
     * @param params - Plant image session params
     * @param username - Username of the user
     * @returns Success message or error object
     */
    private async handleAnalysisResult(output: any, params: PlantImageSessionParams, username: string): Promise<{ success?: string; error?: string }> {
        console.log('Analysis result:', output.result);

        let interpretation: string | ParsedInterpretation;

        if (typeof output.result === 'string') {
            // Handle string result (legacy format or error)
            const resultStr = output.result;

            // Check for error cases
            if (this.isInvalidPlantScan(resultStr)) {
                console.warn("Not a valid plant scan. Skipping save.");
                
                // Create a notification for invalid plant scan
                try {
                    await notificationService.sendRealTimeNotification(username, {
                        type: NotificationType.SYSTEM_ALERT,
                        title: 'Plant Scan Failed',
                        message: 'The uploaded image does not appear to contain a valid plant. Please try again with a clear image of a plant.',
                        metadata: {
                            farmName: params.farmName,
                            cropType: params.cropType,
                            analysisType: 'plant_scan',
                            error: resultStr
                        }
                    });
                } catch (notificationError) {
                    console.error('Failed to send invalid scan notification:', notificationError);
                }
                
                return { error: resultStr };
            }
            // Convert string to ParsedInterpretation object
            interpretation = {
                Diagnosis: resultStr,
                Reason: "",
                Recommendations: []
            };
        } else if (output.result && typeof output.result === 'object') {
            // Handle the new object format
            const result = output.result as AnalysisResult;
            interpretation = {
                Diagnosis: result.Diagnosis,
                Reason: result.Reason,
                Recommendations: result.Recommendations
            };
        } else {
            // Handle unexpected format
            console.warn('Unexpected result format:', output.result);
            return { error: 'Unexpected analysis result format' };
        }

        // Save the plant scan
        const imageRecord = {
            ...params,
            interpretation,
            createdAt: new Date().toISOString()
        };

        await this.plantData.savePlantScan(imageRecord, username);

        // Create a notification for successful plant analysis
        try {
            await notificationService.sendRealTimeNotification(username, {
                type: NotificationType.PLANT_SCAN_COMPLETED,
                title: 'Plant Analysis Complete',
                message: `Your plant scan for ${params.farmName} farm has been analyzed successfully. Diagnosis: ${
                    typeof interpretation === 'object' ? interpretation.Diagnosis : 'Analysis completed'
                }`,
                metadata: {
                    farmName: params.farmName,
                    cropType: params.cropType,
                    analysisType: 'plant_scan',
                    diagnosis: typeof interpretation === 'object' ? interpretation.Diagnosis : interpretation
                }
            });
            console.log('Plant analysis notification sent successfully.');
        } catch (notificationError) {
            console.error('Failed to send plant analysis notification:', notificationError);
            // Don't throw here as the main operation (saving the scan) was successful
        }

        console.log('Plant image analysis complete.');
        return { success: "Plant image analysis complete" };
    }

    /**
     * Check if the scan result indicates an invalid plant scan
     * @param result - The scan result string
     * @returns boolean indicating if the scan is invalid
     */
    private isInvalidPlantScan(result: string): boolean {
        return [
            "Invalid cropType: not a plant",
            "This image does not appear to contain a plant"
        ].some(error => result.includes(error));
    }

    /**
     * Analyze plant image session from API
     * @param token - Auth token
     * @param params - Plant image session params
     * @returns SuccessMessage containing client-generated id
     */
	public async analyzeFromApi(token: string, params: PlantImageSessionParams): Promise<SuccessMessage> {
        const rewardService = new RewardsService();
		try {
			const username = await this.tokenService.verifyAccessToken(token);
			console.log('API Request: Analyzing uploaded plant image...');

			const output = await this.plantImageTeam.start(params);
            

			if (output.status !== 'FINISHED') {
				console.warn('Plant AI Workflow blocked.');
				
				// Create a notification for workflow failure
				try {
					await notificationService.sendRealTimeNotification(username, {
						type: NotificationType.SYSTEM_ALERT,
						title: 'Plant Analysis Failed',
						message: 'There was an issue processing your plant image. Please try again later.',
						metadata: {
							farmName: params.farmName,
							cropType: params.cropType,
							analysisType: 'plant_scan',
							error: 'Workflow blocked during image analysis'
						}
					});
				} catch (notificationError) {
					console.error('Failed to send workflow failure notification:', notificationError);
				}
				
				throw new Error('Workflow blocked during image analysis.');
			}
            await rewardService.sendPlantScanRewards('10', username, params.farmName);
			return await this.handleAnalysisResult(output, params, username);

		} catch (error: any) {
			console.error('Error analyzing plant image:', error);
			
			// Create a notification for general analysis failure
			try {
				const username = await this.tokenService.verifyAccessToken(token);
				await notificationService.sendRealTimeNotification(username, {
					type: NotificationType.SYSTEM_ALERT,
					title: 'Plant Analysis Error',
					message: 'An unexpected error occurred while analyzing your plant image. Please try again.',
					metadata: {
						farmName: params.farmName,
						cropType: params.cropType,
						analysisType: 'plant_scan',
						error: error.message || 'Unknown error'
					}
				});
			} catch (notificationError) {
				console.error('Failed to send general error notification:', notificationError);
			}
			
			throw new Error('Failed to process plant image analysis.');
		}
	}
}

export default PlantImageRunner;
