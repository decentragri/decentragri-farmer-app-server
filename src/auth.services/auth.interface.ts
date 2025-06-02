import type { WalletData } from "../wallet.services/wallet.interface";


export interface UserRegistration {
    username: string;
    password: string;
    deviceId: string;
}

export interface userLogin {
    username: string;
    password: string;



}
export interface UserLoginResponse {
    username: string;
    walletAddress: string;
    accessToken: string;
    refreshToken: string;
    loginType: 'decentragri';
    walletData: WalletData,
    level: number | 1;
    experience: number | 0;

    createdAt?: string;
    rank?: number; 
}


export interface BufferData {
    bufferData: string;
  }