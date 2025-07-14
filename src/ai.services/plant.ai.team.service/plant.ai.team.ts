// ** OPENAI + KAIBAN HYBRID APPROACH **
import OpenAI from "openai";
import { Agent, Task, Team } from "kaibanjs";
import type { PlantImageSessionParams } from "./plant.interface";




class PlantImageTeam {
	private imageAnalyzer: Agent;
	private openai: OpenAI;

	constructor() {
		this.imageAnalyzer = new Agent({
			name: "Carmen",
			role: "Plant Image Health Analyst",
			goal: "Give tailored plant care recommendations based on diagnosis.",
			background: "Expert in agricultural best practices.",
			tools: [],
			llmConfig: {
				provider: "openai",
				model: "gpt-4o-mini",
				apiKey: import.meta.env.OPENAI_API_KEY,
                //@ts-ignore
				apiBaseUrl: "https://api.openai.com/v1",
				maxRetries: 3
			}
		});

		this.openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
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

    private async classifyImageWithOpenAI(base64: string, cropType: string): Promise<string> {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `You are shown an image and given a claimed crop type: "${cropType}".

                            Your responsibilities are as follows:

                            1. **Describe the contents of the image**: Identify what is actually shown in the image. Be specific. Is it a plant (and if so, what kind)? Or is it something else (e.g., a computer, person, animal, etc.)?

                            2. **Validate the claimed cropType**:
                            - Determine if "${cropType}" is a valid and real plant or crop.
                            - If the cropType is obviously not a real plant (e.g., "banana", "furniture", "unknown"), then say: "Invalid cropType: not a plant." — and STOP. Do not proceed to steps 3 or 4.

                            3. **Compare the image content to the cropType**:
                            - If the image shows something completely different (e.g., a person or a dog), reply: "This image does not appear to contain a plant. It appears to show: [your best guess of the object]."
                            - If the image does show a plant, but not the one described by cropType, reply: "You claimed the crop is ${cropType}, but the image appears to show: [your best guess of the actual plant type]."

                            4. **If both cropType and image are valid and match**, then output:
                            - Diagnosis (Healthy or Infested, and the reason)
                            - Evidence (e.g. yellowing, spots, dryness)
                            - Recommendations (2–3 steps to improve plant health)

                            Only one of the outputs should appear depending on the scenario above.`
                        },
                        {
                            type: "image_url",
                            image_url: { url: `data:image/png;base64,${base64}` }
                        }
                    ]
                }
            ]
        });

        return response.choices[0]?.message?.content ?? "";
    }


    public async start(params: PlantImageSessionParams) {
        try {
            const { imageBytes, cropType } = params;
            const base64 = this.convertPackedBytesToBase64(imageBytes);
            if (!base64) throw new Error("Invalid image byte data.");


            const visualClassification = await this.classifyImageWithOpenAI(base64, cropType);
            console.log("Image classified as:", visualClassification);

            if (
                visualClassification.includes("Invalid cropType: not a plant") ||
                visualClassification.includes("This image does not appear to contain a plant")
            ) {
                return {
                    status: 'FINISHED',
                    result: visualClassification
                };
            }


            // Extract diagnosis from the visual classification
            const diagnosisMatch = visualClassification.match(/Diagnosis[\s:]+(Infested|Healthy)/i);
            const diagnosis = diagnosisMatch ? diagnosisMatch[1] : 'Unknown';

            // Extract reason (text after Diagnosis and before Recommendations)
            const reasonMatch = visualClassification.match(/Diagnosis[\s:]+(?:Infested|Healthy)[\s\S]*?\*\*Evidence[\s:]*\*\*([\s\S]*?)(?=\*\*Recommendations|$)/i);
            const reason = reasonMatch ? reasonMatch[1].trim() : 'Unable to determine the reason';

            // Extract recommendations
            const recommendationsMatch = visualClassification.match(/Recommendations[\s:]*([\s\S]*)/i);
            let recommendations: string[] = [];
            
            if (recommendationsMatch) {
                // Split by numbered list items (1., 2., etc.) or dashes
                recommendations = recommendationsMatch[1]
                    .split(/\d+\.\s*|[-•]\s*/)
                    .map(rec => rec.trim())
                    .filter(rec => rec.length > 0);
            } else {
                // Fallback to some default recommendations if none found
                recommendations = [
                    'Inspect the plant for pests and diseases',
                    'Ensure proper watering and sunlight',
                    'Consider consulting a local agricultural expert'
                ];
            }

            // Format the response
            const result = {
                status: 'FINISHED',
                result: {
                    Diagnosis: diagnosis,
                    Reason: reason,
                    Recommendations: recommendations.slice(0, 3) // Take max 3 recommendations
                }
            };

            return result;
        } catch (error) {
            console.error("Failed to process hybrid plant image analysis:", error);
            throw error;
        }
    }

}

export default PlantImageTeam;
