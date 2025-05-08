import type { WalletData } from "../wallet.services/wallet.interface";



export interface userRegistration {
    username: string;
    password: string;
    deviceId: string;
}

export interface userLogin {
    username: string;
    password: string;



}
export interface userLoginResponse {
    username: string;
    walletAddress: string;
    accessToken: string;
    refreshToken: string;
    loginType: 'decentragri';
    walletData: WalletData
    
}