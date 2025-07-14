//**CLASS IMPORT */
import SoilAnalysis from '../../soilanalysis.services/soilanalysisdata';
import type { SuccessMessage } from '../../onchain.services/onchain.interface';
import TokenService from '../../security.services/token.service';
import SoilSensorTeam from './soil.ai.team';

//**TYPE IMPORTS */
import type { SensorReadingsWithInterpretation, SensorSessionParams } from './soil.types';

//** BUN IMPORTS */
import readline from 'readline';

type ParsedAdvice = {
	fertility: string;
	moisture: string;
	ph: string;
	temperature: string;
	sunlight: string;
	humidity: string;
	evaluation: string;
};

class SoilSensorRunner {
	private rl: readline.Interface | null = null;
	private lines: string[] = [];

	constructor() {
		if (process.stdin.isTTY) {
			this.rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
		}
	}
	/**
	 * Starts the CLI for Soil Sensor AI Team.
	 * This method is called when the script is run in a terminal.
	 */
	public startCLI() {
		if (!this.rl) {
			console.error('❌ CLI is not supported in this environment.');
			return;
		}

		console.log('🌱 Welcome to Soil Sensor AI Team!');
		console.log('Paste raw sensor readings (multi-line supported). Type "DONE" when finished:');

		this.rl.on('line', (input) => this.handleCLIInput(input));
		this.rl.on('close', () => {
			console.log('Thank you for using Soil Sensor AI Team. Goodbye!');
			process.exit(0);
		});
	}
	/**
	 * Analyzes sensor data from raw text input.
	 * @param rawData - The raw sensor data input.
	 */
	private async runAnalysisFromRawText(rawData: string) {
		console.log(`Analyzing sensor data...`);
		console.log('Status: RUNNING');

		try {
			// Here you would need to manually parse rawData into object.
			// For now, we'll just log a warning:
			console.warn('⚠️ Raw input not supported in server mode. Please use structured API.');
		} catch (error) {
			console.error('Error analyzing raw input:', error);
		}

		this.lines = [];
		console.log('\nPaste new sensor readings (multi-line). Type "DONE" when finished:');
	}
	/**
	 * Handles the input from the CLI.
	 * @param input - The input string from the user.
	 */
	private handleCLIInput(input: string) {
		if (!this.rl) return;

		if (input.trim().toLowerCase() === 'done') {
			const rawData = this.lines.join('\n');
			this.runAnalysisFromRawText(rawData);
		} else if (input.trim().toLowerCase() === 'quit') {
			this.rl.close();
		} else {
			this.lines.push(input);
		}
	}
	/**
	 * Analyzes sensor data from API.
	 * @param token - The access token for authentication.
	 * @param params - The parameters for the analysis session.
	 * @returns the client generated id
	 */
	public static async analyzeFromApi(token: string, params: SensorSessionParams): Promise<SuccessMessage> {
		const tokenService: TokenService = new TokenService();
		const soilSensorTeam = new SoilSensorTeam();
		const soilAnalysis = new SoilAnalysis();
		try {
			const username: string = await tokenService.verifyAccessToken(token);
			console.log('🌱 API Request: Analyzing provided sensor data...');

			const output = await soilSensorTeam.start(params);

			if (output.status !== 'FINISHED') {
				console.warn('⚠️ Workflow blocked.');
				throw new Error('Workflow blocked during processing.');
			}

			const parsedInterpretation: ParsedAdvice = parseAdviceToObject(output.result as string);

			const dataSensor: SensorReadingsWithInterpretation = {
				...params.sensorData,
				interpretation: parsedInterpretation,
				createdAt: new Date().toISOString()
			};

			await soilAnalysis.saveSoilAnalysisData(dataSensor, username);
			console.log('✅ Analysis complete.');
			

			return { success: params.sensorData.id }
		} catch (error: any) {
			console.error("❌ Error analyzing sensor data:", error);
			throw new Error("Failed to process sensor analysis.");
		}
	}

	
}


function parseAdviceToObject(raw: string): ParsedAdvice {
	const lines = raw.trim().split(/\r?\n/);

	const getLineText = (index: number) => lines[index]?.replace(/^\d+\.\s*/, '') ?? '';

	return {
		fertility: getLineText(0),
		moisture: getLineText(1),
		ph: getLineText(2),
		temperature: getLineText(3),
		sunlight: getLineText(4),
		humidity: getLineText(5),
		evaluation: getLineText(6).replace(/^Overall Evaluation:\s*/i, '')
	};
}



export default SoilSensorRunner;
