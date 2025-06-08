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
     * Start the pest risk forecast analysis
     * @param params - Parameters containing farm and location info
     * @returns Promise resolving to the analysis result
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
                You are an AI agronomist trained to forecast pest infestation risks based on real-world agricultural data.

                User Context:
                - Crop: "${cropType}"
                - Location: Latitude ${location.lat}, Longitude ${location.lng}

                Input Data:
                - Weather: ${JSON.stringify(weather)}
                - Soil Readings: ${JSON.stringify(farmData.soilReadings)}
                - Plant Scans: ${JSON.stringify(farmData.plantScans)}

                Your Job:
                1. Determine pest infestation risk level ("High", "Medium", or "Low").
                2. Justify your assessment using insights from the data.
                3. Suggest 2–3 preventive actions the farmer should take immediately.

                ⚠️ Output MUST be a valid JSON object with the following keys:
                {
                    "RiskLevel": "High" | "Medium" | "Low",
                    "Reason": "Concise justification based on provided data",
                    "PreventiveActions": ["Action 1", "Action 2", "Action 3"]
                }`,
                expectedOutput: `Valid JSON with keys: RiskLevel (string), Reason (string), PreventiveActions (string array).`,
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
            console.error("Failed to run pest forecast AI:", error);
            throw error;
        }
    }

}

export default PestTeam;
