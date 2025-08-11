// ** OPENAI + KAIBAN HYBRID APPROACH **
import OpenAI from "openai";
import { Agent, Task, Team } from "kaibanjs";
import type { PlantImageSessionParams } from "./plant.interface";
import PlantData from "../../plant.services/plantscan.service";




class PlantImageTeam {
	private imageAnalyzer: Agent;
	private responseFormatter: Agent;
	private openai: OpenAI;
	private plantDataService: PlantData;

	constructor() {
		this.plantDataService = new PlantData();
		// Agent 1: Specialized in image analysis
		this.imageAnalyzer = new Agent({
			name: "Ian",
			role: "Analyze plant images and describe any visible health issues.",
			goal: "Provide detailed, accurate descriptions of plant health issues from images.",
			backstory: "You are a plant pathologist with expertise in identifying plant diseases and health issues through visual analysis.",
			tools: [],
			llmConfig: {
				provider: "openai",
				model: "gpt-4.1-mini",
				apiKey: import.meta.env.OPENAI_API_KEY,
				//@ts-ignore
				apiBaseUrl: "https://api.openai.com/v1",
				maxRetries: 5
			}
		});

		// Agent 2: Specialized in response formatting
		this.responseFormatter = new Agent({
			name: "Yuha",
			role: "Convert analysis into structured JSON format.",
			goal: "Transform plant health analysis into clean, well-formatted JSON responses.",
			backstory: "You are a technical expert specializing in data formatting and API responses, ensuring consistent and reliable output.",
			tools: [],
			llmConfig: {
				provider: "openai",
				model: "gpt-4.1-mini",
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

    private async classifyImageWithOpenAI(base64: string, cropType: string, historicalContext?: string): Promise<string> {
        const contextPrompt = historicalContext 
            ? `\n\nHISTORICAL CONTEXT:\n${historicalContext}\n\nConsider this historical information when analyzing the current image.`
            : '';

        const response = await this.openai.chat.completions.create({
            model: "gpt-4.1-mini",
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
                            ${contextPrompt}

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
            const { imageBytes, cropType, farmName, username } = params;
            const base64 = this.convertPackedBytesToBase64(imageBytes);
            if (!base64) throw new Error("Invalid image byte data.");

            // Step 1: Retrieve RAG context from historical scans
            console.log("🔍 Retrieving historical context for RAG...");
            const historicalContext: string = await this.plantDataService.generateRAGContext(username, farmName, cropType);
            console.log(" RAG Context:", historicalContext);

            // Step 2: Get initial image analysis with RAG context
            const visualClassification: string = await this.classifyImageWithOpenAI(base64, cropType, historicalContext);
            console.log("Initial image analysis:", visualClassification);

            // Check for invalid plant images
            if (visualClassification.includes("Invalid cropType: not a plant") ||
                visualClassification.includes("This image does not appear to contain a plant")) {
                return {
                    status: 'FINISHED',
                    result: visualClassification
                };
            }

            // Step 3: Create analysis task for the image analyzer with RAG context
            const analysisTask = new Task({
                id: 'analysis',
                title: "Analyze Plant Health with Historical Context",
                description: `Analyze this plant image and describe any health issues you observe, considering the historical context.
                
                Image Analysis: ${visualClassification}
                Crop Type: ${cropType}
                Farm: ${farmName}
                
                ${historicalContext}
                
                Focus on:
                - Visible diseases or pests
                - Signs of nutrient deficiencies
                - Overall plant health
                - Comparison with previous scans (if any)
                - Progression or improvement from historical data
                - Effectiveness of previous recommendations
                - Any other notable observations`,
                expectedOutput: "A detailed description of the plant's health status considering historical context and any visible issues.",
                agent: this.imageAnalyzer
            });

            // Step 4: Create formatting task for the response formatter
            const formatTask = new Task({
                id: 'formatting',
                title: "Format Analysis Results with Context",
                description: `Convert the plant health analysis into a structured JSON format, incorporating historical insights.
                
                Analysis: ${visualClassification}
                Historical Context: ${historicalContext}
                
                Required JSON structure:
                {
                    "Diagnosis": "Healthy" or "Infested" or "Malnourished",
                    "Reason": "Brief explanation of the diagnosis, referencing historical patterns if relevant",
                    "Recommendations": [
                        "First recommendation",
                        "Second recommendation", 
                        "Third recommendation"
                    ],
                    "HistoricalComparison": "Brief comparison with previous scans (if any historical data exists)"
                }`,
                expectedOutput: "A valid JSON object with the specified structure, no additional text.",
                agent: this.responseFormatter,
                dependencies: ['analysis'] // This task depends on the analysis task
            } as any); // Using type assertion to bypass TypeScript errors

            // Create the team with both agents and tasks
            const team = new Team({
                name: "Plant Health Analysis Pipeline with RAG",
                agents: [this.imageAnalyzer, this.responseFormatter],
                tasks: [analysisTask, formatTask],
                inputs: { analysis: visualClassification }, // Pass the initial analysis to the formatter
                env: {
                    OPENAI_API_KEY: import.meta.env.OPENAI_API_KEY || ""
                }
            });

            // Execute the team workflow
            const result = await team.start();
            
            // Ensure we have a valid result
            if (!result || !result.result) {
                // If we have a visual classification but no result, use it as a fallback
                if (visualClassification) {
                    return {
                        status: 'FINISHED',
                        result: {
                            Diagnosis: 'Unknown',
                            Reason: 'Analysis completed but could not format results',
                            Recommendations: [
                                'Review the plant health manually',
                                'Check for visible signs of disease or pests'
                            ],
                            HistoricalComparison: 'Unable to compare with historical data'
                        }
                    };
                }
                throw new Error("Failed to analyze plant image");
            }

            // Handle the result
            let formattedResult = result.result;
            if (typeof formattedResult === 'string') {
                try {
                    formattedResult = JSON.parse(formattedResult);
                } catch (error: any) {
                    console.error("Failed to parse result as JSON:", formattedResult);
                    // Return a structured error response
                    return {
                        status: 'ERROR',
                        error: 'Failed to parse analysis results',
                        rawResult: formattedResult
                    };
                }
            }

            // Ensure the result has the expected structure
            const resultObj = formattedResult as { Diagnosis?: string; Recommendations?: string[] };
            if (!resultObj.Diagnosis || !resultObj.Recommendations) {
                return {
                    status: 'FINISHED',
                    result: {
                        Diagnosis: 'Unknown',
                        Reason: 'Analysis completed with incomplete results',
                        Recommendations: [
                            'Review the plant health manually',
                            'Check for visible signs of disease or pests'
                        ]
                    }
                };
            }

            return {
                status: 'FINISHED',
                result: formattedResult
            };


        } catch (error) {
            console.error("Failed to process hybrid plant image analysis:", error);
            throw error;
        }
    }

}

export default PlantImageTeam;
