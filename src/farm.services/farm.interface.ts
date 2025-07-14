


export interface FarmData {
  cropType: string;
  farmName: string;
  note?: string;
  image?: string;
}

export interface CreatedFarm {
  farmName: string;
  cropType: string; // List of crop types planted in the farm
  note?: string; // Optional description of the farm
  image?: string; // URL or base64 encoded image of the farm
  id: string; // Unique identifier for the farm
  createdAt?: Date; // Timestamp of farm creation
  updatedAt?: Date; // Timestamp of last update
  owner: string; // Username of the farm owner

}


export interface FarmUpdateData {
  id: string;
  farmName: string;
  cropType: string;
  note?: string;
  image?: string;
}

export interface UpdatedFarm extends CreatedFarm {
}


export interface FarmList {
  farmName: string,
  id: string,
  cropType: string,
  updatedAt: Date,
  
  


}