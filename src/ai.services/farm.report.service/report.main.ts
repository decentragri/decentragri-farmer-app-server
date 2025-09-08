import FarmReportService from "./report.service";
import type { FarmReportParams, FarmReportResult } from "./report.interface";
import type { SuccessMessage } from "../../onchain.services/onchain.interface";

class FarmReportRunner {
    /**
     * Generate comprehensive farm health report
     * @param token - JWT authentication token
     * @param params - FarmReportParams containing report configuration
     * @returns Promise<SuccessMessage> with report result
     */
    public static async generateReport(token: string, params: FarmReportParams): Promise<SuccessMessage> {
        try {
            console.log(`Starting ${params.reportType} report generation for ${params.farmName}`);
            
            const service = new FarmReportService();
            const report: FarmReportResult = await service.generateFarmReport(token, params);
            
            console.log(`Farm report generated successfully. Overall health score: ${report.executiveSummary.overallFarmHealth.score}`);
            
            return {
                success: "Farm report generated successfully",
                report: report
            } as SuccessMessage & { report: FarmReportResult };
            
        } catch (error: any) {
            console.error("Error in farm report runner:", error.message || error);
            return {
                error: `Failed to generate farm report: ${error.message || "Unknown error"}`
            };
        }
    }

    /**
     * Get recent farm reports
     * @param token - JWT authentication token
     * @param farmName - Name of the farm
     * @param limit - Number of reports to retrieve
     * @returns Promise<SuccessMessage> with reports list
     */
    public static async getRecentReports(token: string, farmName: string, limit: number = 10): Promise<SuccessMessage> {
        try {
            console.log(`Fetching recent farm reports for ${farmName}`);
            
            const service = new FarmReportService();
            const reports = await service.getRecentReports(token, farmName, limit);
            
            return {
                success: "Recent farm reports retrieved successfully",
                reports: reports
            } as SuccessMessage & { reports: any[] };
            
        } catch (error: any) {
            console.error("Error fetching farm reports:", error.message || error);
            return {
                error: `Failed to fetch farm reports: ${error.message || "Unknown error"}`
            };
        }
    }

    /**
     * Get specific farm report by ID
     * @param token - JWT authentication token
     * @param farmName - Name of the farm
     * @param reportId - ID of the report to retrieve
     * @returns Promise<SuccessMessage> with full report
     */
    public static async getReportById(token: string, farmName: string, reportId: string): Promise<SuccessMessage> {
        try {
            console.log(`Fetching farm report ${reportId} for ${farmName}`);
            
            const service = new FarmReportService();
            const report = await service.getReportById(token, farmName, reportId);
            
            return {
                success: "Farm report retrieved successfully",
                report: report
            } as SuccessMessage & { report: any };
            
        } catch (error: any) {
            console.error("Error fetching farm report:", error.message || error);
            return {
                error: `Failed to fetch farm report: ${error.message || "Unknown error"}`
            };
        }
    }

    /**
     * Generate weekly report for a farm
     * @param token - JWT authentication token
     * @param farmName - Name of the farm
     * @returns Promise<SuccessMessage> with weekly report
     */
    public static async generateWeeklyReport(token: string, farmName: string): Promise<SuccessMessage> {
        const params: FarmReportParams = {
            farmName,
            reportType: "weekly",
            includeYieldPredictions: true,
            includeSoilAnalysis: true,
            includePlantHealth: true,
            includePestReports: true,
            includeWeatherSummary: true
        };
        
        return this.generateReport(token, params);
    }

    /**
     * Generate monthly report for a farm
     * @param token - JWT authentication token
     * @param farmName - Name of the farm
     * @returns Promise<SuccessMessage> with monthly report
     */
    public static async generateMonthlyReport(token: string, farmName: string): Promise<SuccessMessage> {
        const params: FarmReportParams = {
            farmName,
            reportType: "monthly",
            includeYieldPredictions: true,
            includeSoilAnalysis: true,
            includePlantHealth: true,
            includePestReports: true,
            includeWeatherSummary: true
        };
        
        return this.generateReport(token, params);
    }

    /**
     * Generate seasonal report for a farm
     * @param token - JWT authentication token
     * @param farmName - Name of the farm
     * @returns Promise<SuccessMessage> with seasonal report
     */
    public static async generateSeasonalReport(token: string, farmName: string): Promise<SuccessMessage> {
        const params: FarmReportParams = {
            farmName,
            reportType: "seasonal",
            includeYieldPredictions: true,
            includeSoilAnalysis: true,
            includePlantHealth: true,
            includePestReports: true,
            includeWeatherSummary: true
        };
        
        return this.generateReport(token, params);
    }
}

export default FarmReportRunner;
