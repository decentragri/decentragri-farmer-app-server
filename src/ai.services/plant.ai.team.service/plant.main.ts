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

			// Handle the result which could be an object or string
			let interpretation: string;

			if (typeof output.result === 'string') {
				// Handle string result (legacy format or error)
				interpretation = output.result;

				// Check for error cases
				if (
					interpretation.includes("Invalid cropType: not a plant") ||
					interpretation.includes("This image does not appear to contain a plant")
				) {
					console.warn("Not a valid plant scan. Skipping save.");
					return { error: interpretation };
				}
			} else if (output.result && typeof output.result === 'object') {
				// Handle the new object format
				const result = output.result as {
					Diagnosis: string;
					Reason: string;
					Recommendations: string[];
				};

				// Format the interpretation string from the object
				interpretation = `Diagnosis: ${result.Diagnosis}\n` +
					`Reason: ${result.Reason}\n\n` +
					'Recommendations:\n' +
					result.Recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n');
			} else {
				// Handle unexpected format
				console.warn('Unexpected result format:', output.result);
				return { error: 'Unexpected analysis result format' };
			}

			// ✅ Only save if valid
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
