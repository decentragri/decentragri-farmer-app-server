//**CLASS IMPORTS */
import PlantImageTeam from './plant.ai.team';
import TokenService from '../../security.services/token.service';
import PlantData from '../../plant.services/plantscan.service';

//**TYPE IMPORTS */
import type { SuccessMessage } from '../../onchain.services/onchain.interface';
import type { PlantImageSessionParams } from './plant.interface';

interface AnalysisResult {
    Diagnosis: string;
    Reason: string;
    Recommendations: string[];
}

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
            result.Recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n');
    }

    /**
     * Handle the analysis result and save the plant scan
     * @param output - The output from the plant image team
     * @param params - Plant image session params
     * @param username - Username of the user
     * @returns Success message or error object
     */
    private async handleAnalysisResult(
        output: any,
        params: PlantImageSessionParams,
        username: string
    ): Promise<{ success?: string; error?: string }> {
        console.log('Analysis result:', output.result);

        let interpretation: string;

        if (typeof output.result === 'string') {
            // Handle string result (legacy format or error)
            interpretation = output.result;

            // Check for error cases
            if (this.isInvalidPlantScan(interpretation)) {
                console.warn("Not a valid plant scan. Skipping save.");
                return { error: interpretation };
            }
        } else if (output.result && typeof output.result === 'object') {
            // Handle the new object format
            const result = output.result as AnalysisResult;
            interpretation = this.formatAnalysisResult(result);
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
		try {
			const username = await this.tokenService.verifyAccessToken(token);
			console.log('API Request: Analyzing uploaded plant image...');

			const output = await this.plantImageTeam.start(params);

			if (output.status !== 'FINISHED') {
				console.warn('Plant AI Workflow blocked.');
				throw new Error('Workflow blocked during image analysis.');
			}

			return await this.handleAnalysisResult(output, params, username);

		} catch (error: any) {
			console.error('Error analyzing plant image:', error);
			throw new Error('Failed to process plant image analysis.');
		}
	}
}

export default PlantImageRunner;
