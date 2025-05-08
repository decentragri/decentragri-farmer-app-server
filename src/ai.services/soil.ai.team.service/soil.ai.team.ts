//** KAIBANJS IMPORTS */
import { Agent, Task, Team } from 'kaibanjs';

//**TYPE IMPORTS */
import { type SensorSessionParams } from './soil.types';

class SoilSensorTeam {
	private sensorDataInterpreter: Agent;
	private sensorAdvisor: Agent;

	constructor() {
		this.sensorDataInterpreter = new Agent({
			name: 'Luna',
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
				maxRetries: 3
			}
		});

		this.sensorAdvisor = new Agent({
			name: 'Orion',
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
				maxRetries: 3
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
					
					Your task is to provide **6 specific recommendations**, one for each of the following metrics:
					
					1. Fertility
					2. Moisture
					3. pH
					4. Temperature
					5. Sunlight
					6. Humidity
					
					Each item should correspond **directly** to one of these readings and give actionable advice for optimizing plant growth.
					
					Then, on line 7, provide an **overall evaluation** of the conditions using one of the following categories:
					- Very Good
					- Good
					- Needs Attention
					- Needs Immediate Attention
					
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
						expectedOutput: `A 7-line numbered list with sensor-specific advice followed by a final evaluation.`,
						agent: this.sensorAdvisor
					});
					
					

					const team = new Team({
						name: 'Environmental Monitoring Team',
						agents: [this.sensorDataInterpreter, this.sensorAdvisor],
						tasks: [interpretTask, adviseTask],
						inputs: {},
						env: {
							OPENAI_API_KEY: import.meta.env.DEEPSEEK_API_KEY || ""
						}
					});

	return await team.start();
	}
}

export default SoilSensorTeam;
