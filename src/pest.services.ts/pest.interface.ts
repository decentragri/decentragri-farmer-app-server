export interface PestData {
    pestType: string
    cropAffected: string
    severityLevel: 0| 1 | 2 | 4 | 5
    coordinates : {
        lat: number
        lng: number
    },
    dateTime: string
    imageBytes: string
}

export interface PestReportResponse {
    pestType: string
    cropAffected: string
    severityLevel: number
    lat: number
    lng: number
    dateTime: string
    imageUri: string
    reportedBy: string
    createdAt: string
}