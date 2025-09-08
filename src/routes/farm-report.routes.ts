//** ELYSIA IMPORT */
import Elysia from 'elysia';

//** SERVICE IMPORTS */
import FarmReportRunner from "../ai.services/farm.report.service/report.main";
import { authBearerSchema } from '../auth.services/auth.schema';
import type { FarmReportParams } from "../ai.services/farm.report.service/report.interface";

//** SCHEMA IMPORTS */
import { t } from "elysia";

const farmReportSchema = {
    body: t.Object({
        farmName: t.String({ minLength: 1 }),
        reportType: t.Union([
            t.Literal("weekly"),
            t.Literal("monthly"), 
            t.Literal("seasonal"),
            t.Literal("custom")
        ]),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        includeYieldPredictions: t.Optional(t.Boolean()),
        includeSoilAnalysis: t.Optional(t.Boolean()),
        includePlantHealth: t.Optional(t.Boolean()),
        includePestReports: t.Optional(t.Boolean()),
        includeWeatherSummary: t.Optional(t.Boolean()),
        cropTypes: t.Optional(t.Array(t.String()))
    }),
    headers: t.Object({ authorization: t.String() })
};

const getFarmReportsSchema = {
    params: t.Object({
        farmName: t.String({ minLength: 1 })
    }),
    query: t.Object({
        limit: t.Optional(t.String())
    }),
    headers: t.Object({ authorization: t.String() })
};

const getFarmReportByIdSchema = {
    params: t.Object({
        farmName: t.String({ minLength: 1 }),
        reportId: t.String({ minLength: 1 })
    }),
    headers: t.Object({ authorization: t.String() })
};

const FarmReport = (app: Elysia) => {
    app
    // Generate custom farm report
    .post("/api/generate-farm-report", async ({ headers, body }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const result = await FarmReportRunner.generateReport(jwtToken, body as FarmReportParams);
            return result;
        } catch (error: any) {
            console.error("Error in farm report generation route:", error);
            return { error: "Failed to generate farm report" };
        }
    }, farmReportSchema)
    
    // Generate weekly report
    .post("/api/generate-weekly-report/:farmName", async ({ headers, params }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const { farmName } = params;
            const result = await FarmReportRunner.generateWeeklyReport(jwtToken, farmName);
            return result;
        } catch (error: any) {
            console.error("Error in weekly report generation route:", error);
            return { error: "Failed to generate weekly report" };
        }
    }, {
        params: t.Object({
            farmName: t.String({ minLength: 1 })
        }),
        headers: t.Object({ authorization: t.String() })
    })
    
    // Generate monthly report
    .post("/api/generate-monthly-report/:farmName", async ({ headers, params }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const { farmName } = params;
            const result = await FarmReportRunner.generateMonthlyReport(jwtToken, farmName);
            return result;
        } catch (error: any) {
            console.error("Error in monthly report generation route:", error);
            return { error: "Failed to generate monthly report" };
        }
    }, {
        params: t.Object({
            farmName: t.String({ minLength: 1 })
        }),
        headers: t.Object({ authorization: t.String() })
    })
    
    // Generate seasonal report
    .post("/api/generate-seasonal-report/:farmName", async ({ headers, params }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const { farmName } = params;
            const result = await FarmReportRunner.generateSeasonalReport(jwtToken, farmName);
            return result;
        } catch (error: any) {
            console.error("Error in seasonal report generation route:", error);
            return { error: "Failed to generate seasonal report" };
        }
    }, {
        params: t.Object({
            farmName: t.String({ minLength: 1 })
        }),
        headers: t.Object({ authorization: t.String() })
    })
    
    // Get recent farm reports
    .get("/api/farm-reports/:farmName", async ({ headers, params, query }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const { farmName } = params;
            const limit = parseInt(query.limit as string) || 10;

            const result = await FarmReportRunner.getRecentReports(jwtToken, farmName, limit);
            return result;
        } catch (error: any) {
            console.error("Error in get farm reports route:", error);
            return { error: "Failed to fetch farm reports" };
        }
    }, getFarmReportsSchema)
    
    // Get specific farm report by ID
    .get("/api/farm-reports/:farmName/:reportId", async ({ headers, params }) => {
        try {
            const authorizationHeader: string = headers.authorization;
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                throw new Error('Bearer token not found in Authorization header');
            }
            const jwtToken: string = authorizationHeader.substring(7);

            const { farmName, reportId } = params;

            const result = await FarmReportRunner.getReportById(jwtToken, farmName, reportId);
            return result;
        } catch (error: any) {
            console.error("Error in get farm report by ID route:", error);
            return { error: "Failed to fetch farm report" };
        }
    }, getFarmReportByIdSchema);
}

export default FarmReport;
