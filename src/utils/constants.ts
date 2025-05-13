
// API Configuration
export const API_PREFIX: string = process.env.API_PREFIX || '/api';
export const APP_PORT: number = Number(process.env.APP_PORT) || 8085;
export const PORT: number = Number(process.env.PORT) || 8085;
export const API_KEY: string | undefined = process.env.API_KEY;
export const API_ID: string | undefined = process.env.API_ID;
export const HOST: string = process.env.HOST || 'localhost';
export const JWT_SECRET: string = process.env.JWT_SECRET || 'a secret key';
export const SALT_ROUNDS: string | "" = process.env.SALT_ROUNDS || "10;"

// Neo4j Database Configuration
export const NEO4J_URI: string = process.env.NEO4J_URI || ""
export const NEO4J_USERNAME: string  = process.env.NEO4J_USERNAME || ""
export const NEO4J_PASSWORD: string = process.env.NEO4J_PASSWORD || ""

// KeyDB Configuration
export const KEYDB_PASSWORD: string | undefined = process.env.KEYDB_PASSWORD;
export const KEYDB_PORT: number  = Number(process.env.KEYDB_PORT) || 6379;
export const KEYDB_HOST: string | undefined = process.env.KEYDB_HOST;
export const ENGINE_URI: string = process.env.ENGINE_URI || "https://docker.gmetarave.com:3005";


// Thirdweb SDK Configuration
export const SECRET_KEY: string = process.env.SECRET_KEY || ""
// Chain and Wallet Factory Configuration
export const CHAIN: string  = process.env.CHAIN || "1923"; // SWELL CHAIN

// Contract Addresses
export const DECENTRAGRI_TOKEN: string = '0x10fB9F8c0D73140b8Ec250ec3B0eE5B79A4457e6';
export const SCAN_EDITION_ADDRESS: string = '0x3Ac943b9509b7d9C9E0010a407c81dDC6011597c'; 
export const RSWETH_ADDRESS: string = "0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0"

export const ENGINE_ACCESS_TOKEN: string = process.env.ENGINE_ACCESS_TOKEN || ""
export const ENGINE_ADMIN_WALLET_ADDRESS: string = process.env.ENGINE_ADMIN_WALLET_ADDRESS || ""


export const GOOGLE_CLIENT_ID: string  = process.env.GOOGLE_CLIENT_ID || ""
export const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET || ""

export const GAME_SERVER_KEY: string = process.env.GAME_SERVER_KEY || ""
export const ANDROID_APP_HASH: string = process.env.ANDROID_APP_HASH || ""

export const WEATHER_API_KEY: string = process.env.WEATHER_API_KEY || ""
