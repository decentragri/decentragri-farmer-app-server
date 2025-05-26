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
        const { imageBytes, cropType } = params;
        console.log("type: ", cropType)


        const base64: string = this.convertPackedBytesToBase64(imageBytes);

        if (!base64) {
            throw new Error("Invalid image byte data.");
        }

                const task = new Task({
                    title: "Plant Image Health Analysis",
                    description: `You are shown an image and given a claimed crop type: ${cropType}.
        
                    Your responsibilities are to follow these steps strictly:
        
                    1.  **Analyze the image content:** First, determine what is *actually* shown in the image. Be specific. Is it a plant (and if so, what kind)? A computer? A person? An animal?
                    2.  **Validate the claimed cropType:** Check if the provided \`cropType\` ("${cropType}") is a valid and real plant type.
                        -   If the \`cropType\` is clearly **not a valid or real plant** (e.g., "chair", "banana", or a generic "plant" when you expect a specific crop name), your *sole* output should be: "Invalid cropType: not a plant."
                        -   **Stop here if cropType is invalid.**
        
                    3.  **Compare image to claimed cropType (if cropType is valid):**
                        -   If the image **does not depict a plant at all** (e.g., it shows a computer, a person, or an animal), your *sole* output should be: "This image does not appear to contain a plant. It appears to show: [your guess of what's in the image]."
                        -   If the image **does depict a plant, but it does not match the claimed crop type** (e.g., \`cropType\` says 'corn' but the image is a sunflower), your *sole* output should be: "You claimed the crop is ${cropType}, but the image appears to show: [your guess of the actual plant in the image]."
                        -   **Stop here if the image does not match the claim or is not a plant.**
        
                    4.  **If the cropType is valid AND the image matches the claim AND shows a plant, then assess its health:**
                        -   **Diagnosis:** Healthy or Infested (and the reason why).
                        -   **Evidence:** Describe visible signs in the image (e.g., yellowing, holes, spots).
                        -   **Recommendations:** Give 2–3 helpful suggestions to treat or care for the plant.
        
                    Remember: Your output should be precise and follow the instructions for each scenario.`,
                    expectedOutput: `One of the following:
        - "Invalid cropType: not a plant."
        - "This image does not appear to contain a plant. It appears to show: [your guess]."
        - "You claimed the crop is ${cropType}, but the image appears to show: [your guess]."
        OR, if valid:
        1. Diagnosis: ...
        2. Evidence: ...
        3. Recommendations: ...`,
                    agent: this.imageAnalyzer
                });

        task.inputs = {
            role: "user",
            content: [
                { type: "input_text", text: "Analyze the image based on the provided instructions." },
                {
                    type: "input_image",
                    image_url: base64, // Corrected: directly pass the base64 string
                },
            ],
        }

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
