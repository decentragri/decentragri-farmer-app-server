export interface PlantImageSessionParams {
	imageBytes: string;       // Stringified PackedByteArray from Godot (e.g., "[137,80,78,...]")
	cropType: string;
    farmName: string;    
	location?: {
		lat: number;
		lng: number;
	};
	note?: string;
    
}


export interface PlantImageScanParams {
    imageBytes: string;  
	cropType: string;
    farmName: string;    
	location?: {
		lat: number;
		lng: number;
	};
	note?: string;
	interpretation: string; // Optional interpretation of the scan
    
}