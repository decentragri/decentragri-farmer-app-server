// ** KAIBANJS IMPORTS */
import { Agent, Task, Team } from 'kaibanjs';

// ** TYPE IMPORTS */
export interface PlantImageSessionParams {
	imageBytes: string; // Stringified PackedByteArray from Godot
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
			role: 'Plant Health AI',
			goal: 'Diagnose plant health from image input.',
			background: 'Skilled in visual symptoms of crop pests and diseases.',
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

	private estimateBase64Tokens(base64: string): number {
		return Math.ceil(base64.length / 4); // Rough estimate: 4 chars/token
	}

	public async start(params: PlantImageSessionParams) {
		try {
			const { imageBytes, cropType = 'plant' } = params;
			const base64 = this.convertPackedBytesToBase64(imageBytes);

			if (!base64) {
				throw new Error("Invalid image byte data.");
			}

			const estimatedTokens = this.estimateBase64Tokens(base64);
			console.log(`🧮 Estimated base64 tokens: ${estimatedTokens}`);
			const tokenLimit = 65000;
			const reservedForContext = 15000;

			if (estimatedTokens + reservedForContext > tokenLimit) {
				throw new Error(`Base64 image too large (${estimatedTokens} tokens). Limit: ${tokenLimit - reservedForContext}`);
			}

			const task = new Task({
				description: `Below is a base64-encoded image of a ${cropType}.
Is it healthy or infested?
Explain why and give suggestions.

[data:image/png;base64,${base64}]`,
				expectedOutput: `Diagnosis (healthy or infested), short explanation, and 1–2 recommendations.`,
				agent: this.imageAnalyzer
			});

			const team = new Team({
				name: 'Plant Analysis',
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
