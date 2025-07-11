export interface PlantImageSessionParams {
	imageBytes: string;       // Stringified PackedByteArray from Godot (e.g., "[137,80,78,...]")
	cropType: string;
    farmName: string;    
	note?: string;
    
}


export interface PlantImageScanParams {
    imageBytes: string;  
	cropType: string;
    farmName: string;    
	note?: string;
	interpretation: string; // Optional interpretation of the scan
    
}