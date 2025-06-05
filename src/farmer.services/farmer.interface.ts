


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

export interface CreatedFarm extends FarmData {
  id: string; // Unique identifier for the farm
  createdAt?: Date; // Timestamp of farm creation
  updatedAt?: Date; // Timestamp of last update
  owner?: string; // Username of the farm owner

}

export interface FarmList {
  farmName: string,
  id: string,
  cropType: string,
  
  


}