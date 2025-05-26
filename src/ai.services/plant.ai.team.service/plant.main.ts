//**CLASS IMPORTS */
import PlantImageTeam from './plant.ai.team';
import TokenService from '../../security.services/token.service';
import PlantData from '../../data.services/plantscan.data';

//**TYPE IMPORTS */
import type { PlantImageSessionParams } from './plant.ai.team';
import type { SuccessMessage } from '../../onchain.services/onchain.interface';

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
			console.log('🪴 API Request: Analyzing uploaded plant image...');

			const output = await plantImageTeam.start(params);

			if (output.status !== 'FINISHED') {
				console.warn('⚠️ Plant AI Workflow blocked.');
				throw new Error('Workflow blocked during image analysis.');
			}

			const interpretation = output.result as unknown as string;

			const imageRecord = {
				...params,
				interpretation,
				createdAt: new Date().toISOString()
			};

			await plantData.savePlantScan(imageRecord, username);
			console.log('✅ Plant image analysis complete.');

			return { success: params.imageBytes.slice(0, 20) + '...' }; // Optional success reference
		} catch (error: any) {
			console.error('❌ Error analyzing plant image:', error);
			throw new Error('Failed to process plant image analysis.');
		}
	}
}

export default PlantImageRunner;
