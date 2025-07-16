/**
 * Represents sensor readings collected from agricultural sensors.
 * Contains various environmental and soil condition measurements.
 */
export interface SensorReadings {
	/** Soil fertility level as a µS/cm (0-100) */
	fertility: number;
	/** Soil moisture content as a percentage (0-100) */
	moisture: number;
	/** Soil pH level (0-14 scale) */
	ph: number;
	/** Air temperature in degrees Celsius */
	temperature: number;
	/** Sunlight intensity in lux */
	sunlight: number;
	/** Relative humidity as a percentage (0-100) */
	humidity: number;
	/** Name or identifier of the farm where readings were taken */
	farmName: string;
	/** Type of crop currently planted in the measured area */
	cropType: string;
	/** Unique identifier of the sensor device */
	sensorId: string;


};


/**
 * Contains human-readable interpretations of sensor readings.
 * Provides descriptive analysis of each measured parameter.
 */
export interface Interpretation {
	/** Human-readable interpretation of soil fertility */
	fertility: string;
	/** Human-readable interpretation of soil moisture */
	moisture: string;
	/** Human-readable interpretation of soil pH level */
	ph: string;
	/** Human-readable interpretation of temperature */
	temperature: string;
	/** Human-readable interpretation of sunlight conditions */
	sunlight: string;
	/** Human-readable interpretation of humidity level */
	humidity: string;
	/** Overall evaluation of the soil conditions */
	evaluation: string;
}
	

/**
 * Extends SensorReadings to include AI-generated interpretations
 * and timestamp of when the reading was taken.
 */
export interface SensorReadingsWithInterpretation extends SensorReadings {
	/** AI-generated interpretation of the sensor readings */
	interpretation: Interpretation;
	/** ISO 8601 timestamp of when the reading was taken */
	createdAt: string;
}


/**
 * Parameters required for initializing a sensor data processing session.
 * Contains the raw sensor data to be analyzed.
 */
export interface SensorSessionParams {
	/** Raw sensor data to be processed */
	sensorData: SensorReadings;

};