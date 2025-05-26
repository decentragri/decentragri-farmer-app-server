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
				model: 'gpt-4o-mini',
				apiKey: import.meta.env.OPENAI_API_KEY,
				//@ts-ignore
				apiBaseUrl: 'https://api.openai.com/v1',
				maxRetries: 3
			}
		});
	}

	private convertPackedBytesToBase64(byteString: string): string {
		try {
			const bytes = JSON.parse(byteString) as number[];
			const buffer = Buffer.from(bytes);
			const base64 = buffer.toString("base64");
			return `data:image/png;base64,${base64}`;
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

			// ✅ Token safety check
			const estimatedTokens = this.estimateBase64Tokens(base64);
			console.log(`Estimated tokens for image: ${estimatedTokens}`);
			const tokenLimit = 65000;
			const safetyBuffer = 5000;

			if (estimatedTokens + safetyBuffer > tokenLimit) {
				throw new Error(`Base64 image too large: estimated ${estimatedTokens} tokens. Must stay under ${tokenLimit - safetyBuffer}.`);
			}

			// Task 1: Validate cropType
			const cropCheckTask = new Task({
				description: `Is "${cropType}" a real plant species, crop, or commonly known vegetation? If not, reply with: "Invalid cropType: not a plant."`,
				expectedOutput: `"Invalid cropType: not a plant." or confirmation it's a real plant.`,
				agent: this.imageAnalyzer
			});

			// Task 2: Analyze image only if cropType is valid
			const imageCheckTask = new Task({
				description: `You are shown an image and the valid cropType: "${cropType}". Your responsibilities:

				1. Confirm if the image actually shows a plant. If not, reply: "This image does not appear to contain a plant."

				2. If yes, assess:
				- Diagnosis (Healthy / Infested)
				- Visual Evidence (e.g. spots, wilting, color)
				- 2–3 actionable Recommendations

				Important: Do not hallucinate plant evidence from light glares, keyboards, or desk patterns.`,
								expectedOutput: `Either:
				- "This image does not appear to contain a plant."
				OR
				1. Diagnosis: ...
				2. Evidence: ...
				3. Recommendations: ...`,
				agent: this.imageAnalyzer
			});

			const team = new Team({
				name: 'Plant Image Evaluation Team',
				agents: [this.imageAnalyzer],
				tasks: [cropCheckTask, imageCheckTask],
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
