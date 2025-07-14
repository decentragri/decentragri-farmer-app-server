


export interface FarmData {
  farmName: string;
  cropType: string; // List of crop types planted in the farm
  description?: string; // Optional description of the farm
  image?: string;
  location?: {
  lat: number;
  lng: number;
};

}

export interface CreatedFarm {
  farmName: string;
  cropType: string; // List of crop types planted in the farm
  description?: string; // Optional description of the farm
  image?: string; // URL or base64 encoded image of the farm
  id: string; // Unique identifier for the farm
  createdAt?: Date; // Timestamp of farm creation
  updatedAt?: Date; // Timestamp of last update
  owner: string; // Username of the farm owner
  lat?: number; // Latitude of the farm location
  lng?: number; // Longitude of the farm location
  location: string

}

export interface UpdatedFarm extends CreatedFarm {
  lat?: number; // Latitude of the farm location
  lng?: number; // Longitude of the farm location
}


export interface FarmList {
  farmName: string,
  id: string,
  cropType: string,
  updatedAt: Date,
  
  


}