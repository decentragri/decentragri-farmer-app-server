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

	public async start(params: PlantImageSessionParams) {
		try {
			const { imageBytes, cropType = 'plant' } = params;
			const base64: string = this.convertPackedBytesToBase64(imageBytes);


			if (!base64) {
				throw new Error("Invalid image byte data.");
			}
			
			const task = new Task({
				title: "Plant Image Health Analysis",
				description: `You are shown an image and given a claimed crop type: "{{cropType}}". Your responsibilities are:

			1. Determine whether the provided cropType refers to a real, valid plant species or crop. If it is not a real plant, stop and say: "Invalid cropType: not a plant."
			2. Examine the image and decide if it actually shows a plant. If not, say: "This image does not appear to contain a plant."
			3. If the cropType is valid and the image does appear to be a plant, assess the plant's health as one of:
			- Healthy
			- Infested (due to pests or disease)

			Then provide:
			1. Diagnosis (Healthy or Infested, and the reason)
			2. Visual evidence you noticed in the image (e.g. wilting, spots, color issues)
			3. 2–3 recommendations to improve or treat the plant

			If either the cropType is not a valid plant OR the image does not depict a plant, do not continue analysis.

			Image and cropType are provided via input.`,
				expectedOutput: `One of the following:
			- "Invalid cropType: not a plant."
			- "This image does not appear to contain a plant."
			OR, if valid:
			1. Diagnosis: ...
			2. Evidence: ...
			3. Recommendations: ...`,
				agent: this.imageAnalyzer
			});

			task.inputs = {
				cropType: cropType,
				image: base64 // with data:image/png;base64,...
			};



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
