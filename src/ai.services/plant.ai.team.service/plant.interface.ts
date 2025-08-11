export interface PlantImageSessionParams {
	imageBytes: string;       // Stringified PackedByteArray from Godot (e.g., "[137,80,78,...]")
	cropType: string;
    farmName: string;
	username: string;         // Added for RAG context retrieval
	note?: string;
}


import type { ParsedInterpretation } from "../../plant.services/plantscan.interface";

export interface AnalysisResult {
    Diagnosis: string;
    Reason: string;
    Recommendations: string[];
}

export interface PlantImageScanParams {
    imageBytes: string;  
	cropType: string;
    farmName: string;
	username: string;         // Added for RAG context retrieval
	note?: string;
	interpretation: string | ParsedInterpretation; // Can be either string or parsed interpretation object
}