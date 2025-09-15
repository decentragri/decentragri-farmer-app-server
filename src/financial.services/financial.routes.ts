import { Elysia } from "elysia";

//** SCHEMA IMPORTS */
import {
  FinancialSchemas,
  ExpenseRequestSchema,
  ExpenseUpdateSchema,
  ExpenseQuerySchema,
  IncomeRequestSchema,
  IncomeUpdateSchema,
  IncomeQuerySchema,
  BudgetRequestSchema,
  BudgetUpdateSchema,
  LoanRequestSchema,
  LoanUpdateSchema,
  LoanPaymentSchema,
  InsuranceRequestSchema,
  InsuranceUpdateSchema,
  InsuranceClaimSchema,
  AnalyticsQuerySchema,
  CashFlowProjectionSchema,
  FarmNameParamSchema,
  ExpenseParamSchema,
  IncomeParamSchema,
  BudgetParamSchema,
  LoanParamSchema,
  InsuranceParamSchema,
  ClaimParamSchema
} from './financial.schema';

//** SERVICE IMPORTS */
import FinancialService from './financial.service';

//** TYPE IMPORTS */
import type {
  ExpenseRequest,
  IncomeRequest,
  BudgetRequest,
  LoanRequest,
  InsuranceRequest,
  FinancialResponse,
  ExpenseListResponse,
  IncomeListResponse,
  SuccessMessage
} from './financial.interface';

/**
 * Financial Services API Routes
 * Comprehensive REST endpoints for agricultural financial management
 */
const Financial = (app: Elysia) => {
  const financialService = new FinancialService();

  return app
    .group('/api/financial', (app) =>
      app
        // ========================
        // EXPENSE MANAGEMENT ROUTES
        // ========================
        .post('/expenses', async ({ headers, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const expenseData = body as ExpenseRequest;
          
          return await financialService.createExpense(token, expenseData);
        }, {
          body: ExpenseRequestSchema,
          detail: {
            summary: 'Create new expense record',
            tags: ['Financial Management', 'Expenses']
          }
        })

        .get('/expenses/:farmName', async ({ headers, params, query }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          
          return await financialService.getExpenses(token, farmName, query);
        }, {
          params: FarmNameParamSchema,
          query: ExpenseQuerySchema,
          detail: {
            summary: 'Get farm expenses with filtering and pagination',
            tags: ['Financial Management', 'Expenses']
          }
        })

        .get('/expenses/:farmName/:expenseId', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, expenseId } = params;
          
          return await financialService.getExpenseById(token, farmName, expenseId);
        }, {
          params: ExpenseParamSchema,
          detail: {
            summary: 'Get specific expense by ID',
            tags: ['Financial Management', 'Expenses']
          }
        })

        .put('/expenses/:farmName/:expenseId', async ({ headers, params, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, expenseId } = params;
          const updateData = body as Partial<ExpenseRequest>;
          
          return await financialService.updateExpense(token, farmName, expenseId, updateData);
        }, {
          params: ExpenseParamSchema,
          body: ExpenseUpdateSchema,
          detail: {
            summary: 'Update existing expense record',
            tags: ['Financial Management', 'Expenses']
          }
        })

        .delete('/expenses/:farmName/:expenseId', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, expenseId } = params;
          
          return await financialService.deleteExpense(token, farmName, expenseId);
        }, {
          params: ExpenseParamSchema,
          detail: {
            summary: 'Delete expense record',
            tags: ['Financial Management', 'Expenses']
          }
        })

        // ========================
        // INCOME MANAGEMENT ROUTES
        // ========================
        .post('/income', async ({ headers, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const incomeData = body as IncomeRequest;
          
          return await financialService.createIncome(token, incomeData);
        }, {
          body: IncomeRequestSchema,
          detail: {
            summary: 'Create new income record',
            tags: ['Financial Management', 'Income']
          }
        })

        .get('/income/:farmName', async ({ headers, params, query }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          
          return await financialService.getIncome(token, farmName, query);
        }, {
          params: FarmNameParamSchema,
          query: IncomeQuerySchema,
          detail: {
            summary: 'Get farm income with filtering and pagination',
            tags: ['Financial Management', 'Income']
          }
        })

        .get('/income/:farmName/:incomeId', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, incomeId } = params;
          
          return await financialService.getIncomeById(token, farmName, incomeId);
        }, {
          params: IncomeParamSchema,
          detail: {
            summary: 'Get specific income record by ID',
            tags: ['Financial Management', 'Income']
          }
        })

        .put('/income/:farmName/:incomeId', async ({ headers, params, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, incomeId } = params;
          const updateData = body as Partial<IncomeRequest>;
          
          return await financialService.updateIncome(token, farmName, incomeId, updateData);
        }, {
          params: IncomeParamSchema,
          body: IncomeUpdateSchema,
          detail: {
            summary: 'Update existing income record',
            tags: ['Financial Management', 'Income']
          }
        })

        .delete('/income/:farmName/:incomeId', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, incomeId } = params;
          
          return await financialService.deleteIncome(token, farmName, incomeId);
        }, {
          params: IncomeParamSchema,
          detail: {
            summary: 'Delete income record',
            tags: ['Financial Management', 'Income']
          }
        })

        // ========================
        // BUDGET MANAGEMENT ROUTES
        // ========================
        .post('/budgets', async ({ headers, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const budgetData = body as BudgetRequest;
          
          return await financialService.createBudget(token, budgetData);
        }, {
          body: BudgetRequestSchema,
          detail: {
            summary: 'Create new budget',
            tags: ['Financial Management', 'Budgets']
          }
        })

        .get('/budgets/:farmName', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          
          return await financialService.getFarmBudgets(token, farmName);
        }, {
          params: FarmNameParamSchema,
          detail: {
            summary: 'Get all budgets for a farm',
            tags: ['Financial Management', 'Budgets']
          }
        })

        .get('/budgets/:farmName/:budgetId', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, budgetId } = params;
          
          return await financialService.getBudgetById(token, farmName, budgetId);
        }, {
          params: BudgetParamSchema,
          detail: {
            summary: 'Get specific budget with current spending calculations',
            tags: ['Financial Management', 'Budgets']
          }
        })

        .put('/budgets/:farmName/:budgetId', async ({ headers, params, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, budgetId } = params;
          const updateData = body as Partial<BudgetRequest>;
          
          // Update budget logic would go here
          return { success: "Budget update functionality coming soon" };
        }, {
          params: BudgetParamSchema,
          body: BudgetUpdateSchema,
          detail: {
            summary: 'Update existing budget',
            tags: ['Financial Management', 'Budgets']
          }
        })

        // ========================
        // LOAN MANAGEMENT ROUTES
        // ========================
        .post('/loans', async ({ headers, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const loanData = body as LoanRequest;
          
          return await financialService.createLoan(token, loanData);
        }, {
          body: LoanRequestSchema,
          detail: {
            summary: 'Create new loan record',
            tags: ['Financial Management', 'Loans']
          }
        })

        .get('/loans/:farmName', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          
          // Get farm loans logic would go here
          return { success: "Farm loans retrieval functionality coming soon" };
        }, {
          params: FarmNameParamSchema,
          detail: {
            summary: 'Get all loans for a farm',
            tags: ['Financial Management', 'Loans']
          }
        })

        .get('/loans/:farmName/:loanId', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, loanId } = params;
          
          // Get loan by ID logic would go here
          return { success: "Loan retrieval functionality coming soon" };
        }, {
          params: LoanParamSchema,
          detail: {
            summary: 'Get specific loan with payment history',
            tags: ['Financial Management', 'Loans']
          }
        })

        .post('/loans/:farmName/:loanId/payments', async ({ headers, params, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, loanId } = params;
          const paymentData = body;
          
          return await financialService.recordLoanPayment(token, farmName, loanId, paymentData);
        }, {
          params: LoanParamSchema,
          body: LoanPaymentSchema,
          detail: {
            summary: 'Record loan payment',
            tags: ['Financial Management', 'Loans']
          }
        })

        // ========================
        // INSURANCE MANAGEMENT ROUTES
        // ========================
        .post('/insurance', async ({ headers, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const insuranceData = body as InsuranceRequest;
          
          // Create insurance policy logic would go here
          return { success: "Insurance policy creation functionality coming soon" };
        }, {
          body: InsuranceRequestSchema,
          detail: {
            summary: 'Create new insurance policy',
            tags: ['Financial Management', 'Insurance']
          }
        })

        .get('/insurance/:farmName', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          
          // Get insurance policies logic would go here
          return { success: "Insurance policies retrieval functionality coming soon" };
        }, {
          params: FarmNameParamSchema,
          detail: {
            summary: 'Get all insurance policies for a farm',
            tags: ['Financial Management', 'Insurance']
          }
        })

        .post('/insurance/:farmName/:policyId/claims', async ({ headers, params, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName, policyId } = params;
          const claimData = body;
          
          // Create insurance claim logic would go here
          return { success: "Insurance claim functionality coming soon" };
        }, {
          params: InsuranceParamSchema,
          body: InsuranceClaimSchema,
          detail: {
            summary: 'File insurance claim',
            tags: ['Financial Management', 'Insurance']
          }
        })

        // ========================
        // FINANCIAL ANALYTICS ROUTES
        // ========================
        .get('/analytics/:farmName/summary', async ({ headers, params, query }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          const { startDate, endDate } = query as any;
          
          return await financialService.getFinancialSummary(token, farmName, startDate, endDate);
        }, {
          params: FarmNameParamSchema,
          query: AnalyticsQuerySchema,
          detail: {
            summary: 'Get comprehensive financial summary for a period',
            tags: ['Financial Management', 'Analytics']
          }
        })

        .get('/analytics/:farmName/overview', async ({ headers, params }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          
          return await financialService.getFarmFinancialOverview(token, farmName);
        }, {
          params: FarmNameParamSchema,
          detail: {
            summary: 'Get farm financial overview with key metrics',
            tags: ['Financial Management', 'Analytics']
          }
        })

        .post('/analytics/:farmName/cash-flow-projection', async ({ headers, params, body }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          const { projectionMonths } = body as any;
          
          return await financialService.generateCashFlowProjection(token, farmName, projectionMonths || 12);
        }, {
          params: FarmNameParamSchema,
          body: CashFlowProjectionSchema,
          detail: {
            summary: 'Generate cash flow projection based on historical data',
            tags: ['Financial Management', 'Analytics']
          }
        })

        // ========================
        // REPORTING ROUTES
        // ========================
        .get('/reports/:farmName/profit-loss', async ({ headers, params, query }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          
          // Generate P&L report logic would go here
          return { success: "Profit & Loss report functionality coming soon" };
        }, {
          params: FarmNameParamSchema,
          detail: {
            summary: 'Generate Profit & Loss statement',
            tags: ['Financial Management', 'Reports']
          }
        })

        .get('/reports/:farmName/tax-summary', async ({ headers, params, query }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          
          // Generate tax summary logic would go here
          return { success: "Tax summary report functionality coming soon" };
        }, {
          params: FarmNameParamSchema,
          detail: {
            summary: 'Generate tax summary with deductions',
            tags: ['Financial Management', 'Reports']
          }
        })

        .get('/reports/:farmName/budget-variance', async ({ headers, params, query }) => {
          const token = headers.authorization?.replace('Bearer ', '') || '';
          const { farmName } = params;
          
          // Generate budget variance report logic would go here
          return { success: "Budget variance report functionality coming soon" };
        }, {
          params: FarmNameParamSchema,
          detail: {
            summary: 'Generate budget vs actual spending variance report',
            tags: ['Financial Management', 'Reports']
          }
        })

        // ========================
        // UTILITY ROUTES
        // ========================
        .get('/categories/expenses', async () => {
          return {
            success: "Expense categories retrieved successfully",
            categories: [
              'seeds_plants',
              'fertilizers', 
              'pesticides',
              'equipment',
              'fuel',
              'labor',
              'utilities',
              'insurance',
              'maintenance',
              'transportation',
              'storage',
              'professional_services',
              'taxes_fees',
              'other'
            ]
          };
        }, {
          detail: {
            summary: 'Get available expense categories',
            tags: ['Financial Management', 'Utilities']
          }
        })

        .get('/categories/income-sources', async () => {
          return {
            success: "Income sources retrieved successfully",
            sources: [
              'crop_sales',
              'livestock_sales',
              'equipment_rental',
              'subsidies',
              'insurance_payout',
              'other'
            ]
          };
        }, {
          detail: {
            summary: 'Get available income sources',
            tags: ['Financial Management', 'Utilities']
          }
        })
    );
}

export default Financial;
