export interface SensorReadings  {
	fertility: number;
	moisture: number;
	ph: number;
	temperature: number;
	sunlight: number;
	humidity: number;
	farmName: string;
	cropType?: string;

	sensorId: string;


};

export interface SensorReadingsWithInterpretation extends SensorReadings {
	interpretation: any;
	createdAt: string;
}


export interface SensorSessionParams  {
	sensorData: SensorReadings;

};