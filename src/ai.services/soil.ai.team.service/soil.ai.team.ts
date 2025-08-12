//** KAIBANJS IMPORTS */
import { Agent, Task, Team } from 'kaibanjs';

//**TYPE IMPORTS */
import { type SensorSessionParams } from './soil.types';

//**SERVICE IMPORTS */
import SoilAnalysisService from '../../soilanalysis.services/soilanalysisdata';

class SoilSensorTeam {
	private sensorDataInterpreter: Agent;
	private sensorAdvisor: Agent;
	private responseFormatter: Agent;
	private soilAnalysisService: SoilAnalysisService;

	constructor() {
		this.soilAnalysisService = new SoilAnalysisService();
		
		this.sensorDataInterpreter = new Agent({
			name: 'Ian',
			role: 'Sensor Data Interpreter',
			goal: 'Interpret raw sensor readings into a structured and organized JSON format.',
			background: 'Environmental and agricultural data processor.',
			tools: [],
			llmConfig: {
				provider: 'openai',
				model: 'gpt-4o-mini',
				apiKey: import.meta.env.OPENAI_API_KEY,
				//@ts-ignore
				apiBaseUrl: 'https://api.openai.com/v1',
				maxRetries: 10
			}
		});

		this.responseFormatter = new Agent({
			name: 'Yuha',
			role: 'Convert analysis into structured JSON format.',
			goal: 'Transform soil analysis into clean, well-formatted JSON responses.',
			backstory: 'You are a technical expert specializing in data formatting and API responses, ensuring consistent and reliable output.',
			tools: [],
			llmConfig: {
				provider: 'openai',
				model: 'gpt-4o-mini',
				apiKey: import.meta.env.OPENAI_API_KEY,
				//@ts-ignore
				apiBaseUrl: 'https://api.openai.com/v1',
				maxRetries: 10
			}
		});

		this.sensorAdvisor = new Agent({
			name: 'Yeon',
			role: 'Agricultural Advisor',
			goal: 'Analyze sensor data and recommend actions to optimize plant growth conditions for specific crops.',
			background: 'Expert in soil science and crop management.',
			tools: [],
			llmConfig: {
				provider: 'openai',
				model: 'gpt-4o-mini',
				apiKey: import.meta.env.OPENAI_API_KEY,
				//@ts-ignore
				apiBaseUrl: 'https://api.openai.com/v1',
				maxRetries: 10
			}
		});
	}

	/**
	 * Starts the Soil Sensor AI Team to analyze sensor data and provide recommendations.
	 * @param params - The parameters for the session, including sensor data and context for RAG.
	 * @returns The result of the analysis and recommendations.
	 */
	public async start(params: SensorSessionParams) {
		console.log("Starting soil analysis with params:", JSON.stringify(params, null, 2));
		const { sensorData, username, farmName } = params;

		// Generate RAG context if username and farmName are provided
		let ragContext = "";
		let lastReadingComparison = "";
		
		if (username && farmName && sensorData.cropType) {
			try {
				console.log("Generating RAG context for soil analysis...");
				ragContext = await this.soilAnalysisService.generateSoilRAGContext(
					username, 
					farmName, 
					sensorData.cropType
				);
				
				const lastReading = await this.soilAnalysisService.getLastSoilReadingForComparison(
					username, 
					farmName, 
					sensorData.cropType
				);
				
				if (lastReading) {
					const daysSinceLastReading = Math.floor((Date.now() - new Date(lastReading.createdAt).getTime()) / (1000 * 60 * 60 * 24));
					lastReadingComparison = `
					
					COMPARISON WITH MOST RECENT READING (${daysSinceLastReading} days ago):
					- Previous Fertility: ${lastReading.fertility} µS/cm → Current: ${sensorData.fertility} µS/cm
					- Previous Moisture: ${lastReading.moisture}% → Current: ${sensorData.moisture}%
					- Previous pH: ${lastReading.ph} → Current: ${sensorData.ph}
					- Previous Temperature: ${lastReading.temperature}°C → Current: ${sensorData.temperature}°C
					- Previous Sunlight: ${lastReading.sunlight} lux → Current: ${sensorData.sunlight} lux
					- Previous Humidity: ${lastReading.humidity}% → Current: ${sensorData.humidity}%
					- Previous Interpretation: ${lastReading.interpretation}

					 analyze trends and changes between these readings.`;
				}
			} catch (error) {
				console.error("Error generating RAG context:", error);
				ragContext = "Historical context unavailable for this analysis.";
			}
		}

		// Create a task to format the sensor data
		const interpretTask = new Task({
			title: "Format Sensor Data",
			description: `Format the following sensor data into a clean JSON structure:
			
			${JSON.stringify(sensorData, null, 2)}

			Required Output Format:
			{
			"fertility": number,
			"moisture": number,
			"ph": number,
			"temperature": number,
			"sunlight": number,
			"humidity": number
			}`,
			expectedOutput: `{
			"fertility": number,
			"moisture": number,
			"ph": number,
			"temperature": number,
			"sunlight": number,
			"humidity": number
			}`,
			agent: this.sensorDataInterpreter
		});

		// Create a task to analyze the sensor data
		const adviseTask = new Task({
			title: "Analyze Soil Conditions",
			description: `You are an agricultural expert analyzing soil sensor data for a ${sensorData.cropType || 'crop'} farm.

${ragContext ? `HISTORICAL CONTEXT:\n${ragContext}\n` : ''}

CURRENT SENSOR READINGS:
- Fertility: ${sensorData.fertility} µS/cm (electrical conductivity)
- Moisture: ${sensorData.moisture}% (volumetric water content)
- pH: ${sensorData.ph} (standard pH scale)
- Temperature: ${sensorData.temperature}°C
- Sunlight: ${sensorData.sunlight} lux
- Humidity: ${sensorData.humidity}%
${lastReadingComparison}

ANALYSIS REQUIREMENTS:
${ragContext ? 
`- Consider the historical trends and patterns from previous readings
- Compare current readings with historical data to identify improvements or deteriorations
- Reference any seasonal variations or consistent patterns from the historical context
- Evaluate the effectiveness of any previous recommendations if applicable
- Provide context-aware recommendations based on the progression shown in historical data` :
`- Analyze the current soil conditions for optimal crop growth
- Provide specific recommendations for each metric`}

Provide specific recommendations for each metric and an overall evaluation. Use this exact format:

1. Fertility: [Your analysis and recommendation for fertility${ragContext ? ' considering historical trends' : ''}]
2. Moisture: [Your analysis and recommendation for moisture${ragContext ? ' considering historical trends' : ''}]
3. pH: [Your analysis and recommendation for pH level${ragContext ? ' considering historical trends' : ''}]
4. Temperature: [Your analysis and recommendation for temperature${ragContext ? ' considering historical trends' : ''}]
5. Sunlight: [Your analysis and recommendation for sunlight${ragContext ? ' considering historical trends' : ''}]
6. Humidity: [Your analysis and recommendation for humidity${ragContext ? ' considering historical trends' : ''}]
7. Overall Evaluation: [Very Good/Good/Needs Attention/Needs Immediate Attention]
${ragContext ? '8. Historical Comparison: [Summary of trends and changes compared to previous readings]' : ''}`,
			expectedOutput: `A ${ragContext ? '8' : '7'}-line numbered list with specific recommendations for each metric followed by an overall evaluation${ragContext ? ' and historical comparison' : ''}.`,
			agent: this.sensorAdvisor,
			dependencies: ['interpretTask']
		});

		// Create a task to format the analysis results
		const formatTask = new Task({
			title: "Format Analysis Results",
			description: `Convert the agricultural analysis into a structured JSON format.

Input (from previous task):
{{adviseTask}}

Expected Output Format:
{
  "Fertility": "[analysis text]",
  "Moisture": "[analysis text]",
  "pH": "[analysis text]",
  "Temperature": "[analysis text]",
  "Sunlight": "[analysis text]",
  "Humidity": "[analysis text]",
  "Evaluation": "[overall evaluation]"${ragContext ? ',\n  "HistoricalComparison": "[historical comparison analysis]"' : ''}
}

Rules:
1. Extract the text after each numbered item
2. Remove any numbering or prefixes
3. For the evaluation, only keep the rating (e.g., "Good" from "Overall Evaluation: Good")
${ragContext ? '4. Include the HistoricalComparison field if present in the analysis' : '4. Do not include any fields not specified above'}`,
			expectedOutput: "A valid JSON object with the specified structure, no additional text.",
			agent: this.responseFormatter,
			dependencies: ['adviseTask']
		});
		
		// Create and configure the team
		const team = new Team({
			name: 'Soil Analysis Team',
			agents: [this.sensorDataInterpreter, this.sensorAdvisor, this.responseFormatter],
			tasks: [interpretTask, adviseTask, formatTask],
			env: {
				OPENAI_API_KEY: import.meta.env.OPENAI_API_KEY || ""
			}
		});

		try {
			console.log("Starting team workflow...");
			const result = await team.start();
			console.log("Team workflow completed with result:", result);
			return result;
		} catch (error) {
			console.error("Error in team workflow:", error);
			throw error;
		}
	}
	
}

export default SoilSensorTeam;
