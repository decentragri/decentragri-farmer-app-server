



export interface PlantScanResult {
	cropType: string;
	note: string | null;
	lat: number | null;
	lng: number | null;
	createdAt: string; // ISO 8601 format
	interpretation: string | ParsedInterpretation
}


export interface ParsedInterpretation {
	Diagnosis: string;
	Reason: string;
	Recommendations: string[];
}

