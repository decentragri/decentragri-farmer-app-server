//** KAIBANJS IMPORTS */
import { Agent, Task, Team } from 'kaibanjs';

//**TYPE IMPORTS */
export interface PlantImageSessionParams {
	imageBytes: string;       // Stringified PackedByteArray from Godot (e.g., "[137,80,78,...]")
	cropType: string;        // ISO 8601
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
				model: 'gpt-4.1-mini', // or 'gpt-4-turbo' if using text-only analysis
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
			return buffer.toString("base64");
		} catch (error) {
			console.error("Failed to parse image bytes:", error);
			return "";
		}
	}

	public async start(params: PlantImageSessionParams) {
		try {
			const { imageBytes, cropType = 'plant' } = params;
			const base64 = this.convertPackedBytesToBase64(imageBytes);

			if (!base64) {
				throw new Error("Invalid image byte data.");
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
			throw error; // Optional: wrap with custom error if needed
		}
	}

}

export default PlantImageTeam;
