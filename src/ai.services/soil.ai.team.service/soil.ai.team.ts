//** KAIBANJS IMPORTS */
import { Agent, Task, Team } from 'kaibanjs';

//**TYPE IMPORTS */
import { type SensorSessionParams } from './soil.types';

class SoilSensorTeam {
	private sensorDataInterpreter: Agent;
	private sensorAdvisor: Agent;
	private responseFormatter: Agent;

	constructor() {
		this.sensorDataInterpreter = new Agent({
			name: 'Ian',
			role: 'Sensor Data Interpreter',
			goal: 'Interpret raw sensor readings into a structured and organized JSON format.',
			background: 'Environmental and agricultural data processor.',
			tools: [],
			llmConfig: {
				provider: 'openai',
				model: 'deepseek-chat',
				apiKey: import.meta.env.DEEPSEEK_API_KEY,
				//@ts-ignore
				apiBaseUrl: 'https://api.deepseek.com/v1',
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
				model: 'deepseek-chat',
				apiKey: import.meta.env.DEEPSEEK_API_KEY,
				//@ts-ignore
				apiBaseUrl: 'https://api.deepseek.com/v1',
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
				model: 'deepseek-chat',
				apiKey: import.meta.env.DEEPSEEK_API_KEY,
				//@ts-ignore
				apiBaseUrl: 'https://api.deepseek.com/v1',
				maxRetries: 10
			}
		});
	}

	/**
	 * Starts the Soil Sensor AI Team to analyze sensor data and provide recommendations.
	 * @param params - The parameters for the session, including sensor data and crop type.
	 * @returns The result of the analysis and recommendations.
	 */
	public async start(params: SensorSessionParams) {
		console.log("Starting soil analysis with params:", JSON.stringify(params, null, 2));
		const { sensorData } = params;

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

Sensor readings:
- Fertility: ${sensorData.fertility} µS/cm (electrical conductivity)
- Moisture: ${sensorData.moisture}% (volumetric water content)
- pH: ${sensorData.ph} (standard pH scale)
- Temperature: ${sensorData.temperature}°C
- Sunlight: ${sensorData.sunlight} lux
- Humidity: ${sensorData.humidity}%

Provide specific recommendations for each metric and an overall evaluation. Use this exact format:

1. Fertility: [Your analysis and recommendation for fertility]
2. Moisture: [Your analysis and recommendation for moisture]
3. pH: [Your analysis and recommendation for pH level]
4. Temperature: [Your analysis and recommendation for temperature]
5. Sunlight: [Your analysis and recommendation for sunlight]
6. Humidity: [Your analysis and recommendation for humidity]
7. Overall Evaluation: [Very Good/Good/Needs Attention/Needs Immediate Attention]`,
			expectedOutput: "A 7-line numbered list with specific recommendations for each metric followed by an overall evaluation.",
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
  "Evaluation": "[overall evaluation]"
}

Rules:
1. Extract the text after each numbered item
2. Remove any numbering or prefixes
3. For the evaluation, only keep the rating (e.g., "Good" from "Overall Evaluation: Good")"`,
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
				OPENAI_API_KEY: import.meta.env.DEEPSEEK_API_KEY || ""
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
