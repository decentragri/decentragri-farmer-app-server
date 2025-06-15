import type { UserLoginResponse } from "../auth.services/auth.interface";

export interface LevelUpResult {
    currentLevel: number;
    currentExperience: number;
    experienceGained: number;
}

export interface UserProfileResponse extends UserLoginResponse {
    farmCount: number;
    plantScanCount: number;
    readingCount: number;
}