export interface SensorReadings  {
	fertility: number;
	moisture: number;
	ph: number;
	temperature: number;
	sunlight: number;
	humidity: number;
	cropType?: string;
	username: string;
	sensorId: string;
	id: string;

};

export interface SensorReadingsWithInterpretation extends SensorReadings {
	interpretation: any;
	createdAt: string;
}


export interface SensorSessionParams  {
	sensorData: SensorReadings;

};