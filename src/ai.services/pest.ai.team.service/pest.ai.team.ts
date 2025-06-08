//** KAIBANJS IMPORT */
import { Agent, Task, Team } from "kaibanjs";

//** SERVICE IMPORT */
import FarmDataService from "../../data.services/farmscan.data";
import WeatherService from "../../weather.services/weather.service";

//** TYPE INTERFACE */
import type { FarmScanResult } from "../../data.services/data.interface";
import type { PestRiskForecastParams } from "./pest.interface";
import type { WeatherData } from "../../weather.services/weather.interface";





class PestTeam {
	private pestRiskAnalyzer: Agent;

	constructor() {
		this.pestRiskAnalyzer = new Agent({
			name: "Jiwoo",
			role: "Pest Risk Forecast Specialist",
			goal: "Forecast pest infestation risk based on soil, plant, and weather data. Provide prevention advice.",
			background: "Agronomist specialized in crop pest risk forecasting.",
			tools: [],
			llmConfig: {
				provider: "openai",
				model: "gpt-4o-mini",
				apiKey: import.meta.env.DEEPSEEK_API_KEY,
				//@ts-ignore
				apiBaseUrl: "https://api.deepseek.com/v1",
				maxRetries: 3
			}
		});
	}

    /**
     * Starts the pest risk forecast process for a given farm and crop.
     *
     * This method gathers recent farm data and current weather information,
     * then creates and runs an AI-powered task to assess the risk of pest infestation.
     * The AI agent analyzes the provided data and returns a JSON object indicating
     * the risk level, justification, and recommended preventive actions.
     *
     * @param params - The parameters required to perform the pest risk forecast, including farm name, username, location, and crop type.
     * @returns A promise that resolves with the result of the pest risk forecast team execution.
     * @throws Will throw an error if the forecast process fails.
     */
	public async start(params: PestRiskForecastParams) {
		try {
			const { farmName, username, location, cropType } = params;

			// Load recent farm data (last 7 days)
			const farmDataService = new FarmDataService();
			const farmData: FarmScanResult = await farmDataService.getRecentFarmScans(username, farmName);

			// Fetch current weather for farm
			const weatherService = new WeatherService();
			const weather: WeatherData = await weatherService.currentWeatherInternal(location.lat, location.lng);

            const task = new Task({
                title: "Pest Infestation Forecast",
                description: `
            You are an AI specialized in forecasting crop pest risks.

            The user is cultivating "${cropType}" on a farm located at latitude ${location.lat} and longitude ${location.lng}.

            Provided Data:
            - Weather Information: ${JSON.stringify(weather)}
            - Soil Measurements: ${JSON.stringify(farmData.soilReadings)}
            - Plant Health Scans: ${JSON.stringify(farmData.plantScans)}

            Objectives:
            1. Determine whether there is a high, medium, or low risk of pest infestation.
            2. Explain your assessment with insights from the data (e.g., high humidity leads to increased pest risk).
            3. Recommend 2–3 preventive measures for the farmer to implement immediately.

            Example Response Format:
            {
            "RiskLevel": "High | Medium | Low",
            "Reason": "Concise justification based on provided data",
            "PreventiveActions": ["Action 1", "Action 2", "Action 3"]
            }`,
                expectedOutput: `A valid JSON object with keys: RiskLevel, Reason, PreventiveActions`,
                agent: this.pestRiskAnalyzer
            });

			const team = new Team({
				name: "Pest Risk Forecast Team",
				agents: [this.pestRiskAnalyzer],
				tasks: [task],
				inputs: {},
				env: {
					OPENAI_API_KEY: import.meta.env.DEEPSEEK_API_KEY || ""
				}
			});

			return await team.start();
		} catch (error) {
			console.error("❌ Failed to run pest forecast AI:", error);
			throw error;
		}
	}
}

export default PestTeam;
