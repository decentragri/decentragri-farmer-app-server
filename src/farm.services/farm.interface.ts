
interface FarmCoordinates {
  lat: number;
  lng: number;
}

export interface FarmData {
  cropType: string;
  farmName: string;
  note?: string;
  imageBytes: string;
  coordinates: FarmCoordinates
}

export interface CreatedFarm {
  farmName: string;
  cropType: string; // List of crop types planted in the farm
  note?: string; // Optional description of the farm
  image: string; // URL or base64 encoded image of the farm
  id: string; // Unique identifier for the farm
  createdAt?: Date; // Timestamp of farm creation
  updatedAt?: Date; // Timestamp of last update
  isForSale?: boolean;
  formattedUpdatedAt?: string;
  formattedCreatedAt?: string;
  owner: string; // Username of the farm owner
  coordinates: FarmCoordinates;
  location: string;
}


export interface FarmUpdateData {
  id: string;
  farmName: string;
  cropType: string;
  note?: string;
  imageBytes?: string;
}

export interface UpdatedFarm extends CreatedFarm {
}


export interface FarmList {
  farmName: string,
  image: string,
  id: string,
  cropType: string,
  updatedAt: Date,
  coordinates: FarmCoordinates
}