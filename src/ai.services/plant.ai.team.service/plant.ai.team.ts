// ** KAIBANJS IMPORTS */
import { Agent, Task, Team } from 'kaibanjs';

// ** TYPE IMPORTS */
export interface PlantImageSessionParams {
	imageBytes: string;       // Stringified PackedByteArray from Godot (e.g., "[137,80,78,...]")
	cropType: string;
	location?: {
		lat: number;
		lng: number;
	};
	note?: string;
}

class PlantImageTeam {
	private imageAnalyzer: Agent;

	constructor() {
		this.imageAnalyzer = new Agent({
			name: 'Carmen',
			role: 'Plant Image Health Analyst',
			goal: 'Analyze a plant image and determine if it is healthy or infested. If infested, provide actionable advice.',
			background: 'Expert in crop diseases, pest detection, and visual diagnosis of plant health.',
			tools: [],
			llmConfig: {
				provider: 'openai',
				model: 'deepseek-chat',
				apiKey: import.meta.env.DEEPSEEK_API_KEY,
				//@ts-ignore
				apiBaseUrl: 'https://api.deepseek.com/v1',
				maxRetries: 3
			}
		});
	}

	private convertPackedBytesToBase64(byteString: string): string {
		try {
			const bytes = JSON.parse(byteString) as number[];
			const buffer = Buffer.from(bytes);
			return buffer.toString("base64");
		} catch (error) {
			console.error("Failed to parse image bytes:", error);
			return "";
		}
	}

	// Rough Base64 token estimator: ~4 chars per token
	private estimateBase64Tokens(base64: string): number {
		return Math.ceil(base64.length / 4);
	}

	public async start(params: PlantImageSessionParams) {
		try {
			const { imageBytes, cropType = 'plant' } = params;
			const base64 = this.convertPackedBytesToBase64(imageBytes);

			if (!base64) {
				throw new Error("Invalid image byte data.");
			}

			// ✅ Check token estimate before proceeding
			const estimatedTokens = this.estimateBase64Tokens(base64);
			console.log(`Estimated tokens for image: ${estimatedTokens}`);
			const tokenLimit = 65000;
			const safetyBuffer = 5000;

			if (estimatedTokens + safetyBuffer > tokenLimit) {
				throw new Error(
					`Base64 image too large: estimated ${estimatedTokens} tokens. Must stay under ${tokenLimit - safetyBuffer}.`
				);
			}

			const task = new Task({
				description: `You are shown an image of a ${cropType}. Determine whether it appears:
				- Healthy
				- Infested (by pests or disease)

				Then provide:
				1. Diagnosis (Healthy / Infested + reason)
				2. Evidence you noticed in the image (e.g., spots, wilting)
				3. Recommendations to improve or treat the plant.

				Analyze the image below:

				[data:image/png;base64,${base64}]`,
				expectedOutput: `A brief diagnosis, evidence, and 2-3 recommendations.`,
				agent: this.imageAnalyzer
			});

			const team = new Team({
				name: 'Plant Image Evaluation Team',
				agents: [this.imageAnalyzer],
				tasks: [task],
				inputs: {},
				env: {
					OPENAI_API_KEY: import.meta.env.OPENAI_API_KEY || ""
				}
			});

			return await team.start();
		} catch (error) {
			console.error("❌ Failed to start PlantImageSession:", error);
			throw error;
		}
	}
}

export default PlantImageTeam;
