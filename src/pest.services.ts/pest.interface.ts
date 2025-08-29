export interface PestData {
    pestType: string
    cropAffected: string
    severityLevel: 0| 1 | 2 | 4 | 5
    location: string
    dateTime: string
    image: number[]
}