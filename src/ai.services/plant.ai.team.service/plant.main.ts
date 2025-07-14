//**CLASS IMPORTS */
import PlantImageTeam from './plant.ai.team';
import TokenService from '../../security.services/token.service';
import PlantData from '../../plant.services/plantscan.service';

//**TYPE IMPORTS */

import type { SuccessMessage } from '../../onchain.services/onchain.interface';
import type { PlantImageSessionParams } from './plant.interface';

class PlantImageRunner {
	/**
	 * Analyze plant image session from API
	 * @param token - Auth token
	 * @param params - Plant image session params
	 * @returns SuccessMessage containing client-generated id
	 */
	public static async analyzeFromApi(token: string, params: PlantImageSessionParams): Promise<SuccessMessage> {
		const tokenService = new TokenService();
		const plantImageTeam = new PlantImageTeam();
		const plantData = new PlantData();

		try {
			const username = await tokenService.verifyAccessToken(token);
			console.log('API Request: Analyzing uploaded plant image...');

			const output = await plantImageTeam.start(params);

			if (output.status !== 'FINISHED') {
				console.warn('⚠️ Plant AI Workflow blocked.');
				throw new Error('Workflow blocked during image analysis.');
			}

			// Log the result for debugging
			console.log('Analysis result:', output.result);

			// Define the expected type for the analysis result
			interface PlantAnalysisResult {
				Diagnosis: string;
				Reason: string;
				Recommendations: string[];
			}

			// Check if the result is a string (old format) or an object (new format)
			let analysisResult: PlantAnalysisResult;

			if (typeof output.result === 'string') {
				// Handle old string format (for backward compatibility)
				if (output.result.includes("Invalid cropType: not a plant") || 
					output.result.includes("This image does not appear to contain a plant")) {
					console.warn("Not a valid plant scan. Skipping save.");
					return { error: output.result };
				}
				// Create a default analysis result for old format
				analysisResult = {
					Diagnosis: 'Unknown',
					Reason: 'Legacy analysis format',
					Recommendations: [
						'This analysis was performed using an older format.',
						'Please rescan for more detailed recommendations.'
					]
				};
			} else {
				// New object format
				analysisResult = output.result as PlantAnalysisResult;
			}

			// Check if the analysis indicates an invalid plant scan
			if (!analysisResult.Diagnosis || analysisResult.Diagnosis === 'Unknown') {
				console.warn("Not a valid plant scan. Skipping save.");
				return { error: "Unable to analyze the plant. Please ensure the image contains a valid plant." };
			}

			// Format the interpretation as a string for storage
			const interpretation = `Diagnosis: ${analysisResult.Diagnosis}
Reason: ${analysisResult.Reason}

Recommendations:
${analysisResult.Recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

			// Create the image record with the formatted interpretation
			const imageRecord = {
				...params,
				interpretation,
				createdAt: new Date().toISOString()
			};

			await plantData.savePlantScan(imageRecord, username);
			console.log('Plant image analysis complete.');

			return { success: "Plant image analysis complete" };

		} catch (error: any) {
			console.error('Error analyzing plant image:', error);
			throw new Error('Failed to process plant image analysis.');
		}
	}
}

export default PlantImageRunner;
