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
		const { sensorData } = params;
	
		const interpretTask = new Task({
			description: `Given the following structured sensor data, reformat it into clean JSON:
	
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
		
			const adviseTask = new Task({
				description: `You're given sensor readings from an agricultural monitoring system. Each reading affects crop growth.
		
				Sensor readings are provided in the following units:
				- Fertility: µS/cm (electrical conductivity)
				- Moisture: % (volumetric water content)
				- pH: standard pH scale
				- Temperature: °C (degrees Celsius)
				- Sunlight: lux (light intensity)
				- Humidity: % (relative humidity)
				
				Your task is to provide **6 specific recommendations**, one for each metric based on the cropType.
				Then, on line 7, provide an **overall evaluation** of the conditions using one of: Very Good, Good, Needs Attention, Needs Immediate Attention.
				
				Sensor Data:
				${JSON.stringify(sensorData, null, 2)}
				
				Output Format:
				1. Advice related to fertility
				2. Advice related to moisture
				3. Advice related to pH
				4. Advice related to temperature
				5. Advice related to sunlight
				6. Advice related to humidity
				7. Overall Evaluation: <category>`,
				expectedOutput: "A 7-line numbered list with sensor-specific advice followed by a final evaluation.",
				agent: this.sensorAdvisor
			});
		
			const formatTask = new Task({
				id: 'formatting',
				title: "Format Analysis Results",
				description: `Convert the soil analysis into a structured JSON format.
		
				Analysis: \${adviseTask.result}
				
				Required JSON structure:
				{
				"Fertility": "Advice related to fertility",
				"Moisture": "Advice related to moisture",
				"pH": "Advice related to pH",
				"Temperature": "Advice related to temperature",
				"Sunlight": "Advice related to sunlight",
				"Humidity": "Advice related to humidity",
				"Evaluation": "Overall Evaluation: <category>"
				}`,
				expectedOutput: "A valid JSON object with the specified structure, no additional text.",
				agent: this.responseFormatter,
				dependencies: ['adviseTask'] // depends on adviseTask
			} as any);
		
			const team = new Team({
				name: 'Environmental Monitoring Team',
				agents: [this.sensorDataInterpreter, this.sensorAdvisor, this.responseFormatter],
				tasks: [interpretTask, adviseTask, formatTask],
				inputs: {},
				env: {
					OPENAI_API_KEY: import.meta.env.DEEPSEEK_API_KEY || ""
				}
			});
	
		return await team.start();
	}
	
}

export default SoilSensorTeam;
