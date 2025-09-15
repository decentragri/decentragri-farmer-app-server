import { Driver, ManagedTransaction, Session } from 'neo4j-driver-core';
import { v4 as uuid } from 'uuid';

//** TYPE IMPORTS */
import type {
  ExpenseRequest,
  Expense,
  IncomeRequest,
  Income,
  BudgetRequest,
  Budget,
  LoanRequest,
  Loan,
  LoanPayment,
  InsuranceRequest,
  InsurancePolicy,
  InsuranceClaim,
  FinancialSummary,
  CashFlowProjection,
  FinancialResponse,
  ExpenseListResponse,
  IncomeListResponse,
  SuccessMessage
} from './financial.interface';

//** SERVICE IMPORTS */
import TokenService from '../security.services/token.service';

//** CONFIG IMPORT */
import { getDriver } from '../db/memgraph';

//** CYPHER IMPORTS */
import {
  CREATE_EXPENSE,
  UPDATE_EXPENSE,
  DELETE_EXPENSE,
  GET_EXPENSE_BY_ID,
  GET_EXPENSES,
  GET_EXPENSE_SUMMARY,
  CREATE_INCOME,
  UPDATE_INCOME,
  DELETE_INCOME,
  GET_INCOME_BY_ID,
  GET_INCOME_LIST,
  GET_INCOME_SUMMARY,
  CREATE_BUDGET,
  UPDATE_BUDGET,
  DELETE_BUDGET,
  GET_BUDGET_BY_ID,
  GET_FARM_BUDGETS,
  CREATE_LOAN,
  UPDATE_LOAN,
  CREATE_LOAN_PAYMENT,
  GET_LOAN_BY_ID,
  GET_FARM_LOANS,
  CREATE_INSURANCE_POLICY,
  CREATE_INSURANCE_CLAIM,
  GET_INSURANCE_POLICIES,
  GET_FINANCIAL_SUMMARY,
  GET_CASH_FLOW_PROJECTION,
  GET_FARM_FINANCIAL_OVERVIEW
} from './financial.cypher';

/**
 * Financial Services Class
 * Comprehensive financial management for agricultural operations
 */
class FinancialService {
  private driver: Driver;
  private tokenService: TokenService;

  constructor() {
    this.driver = getDriver();
    this.tokenService = new TokenService();
  }

  // ========================
  // EXPENSE MANAGEMENT
  // ========================

  /**
   * Create a new expense record
   */
  public async createExpense(token: string, expenseData: ExpenseRequest): Promise<SuccessMessage> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);
      const expenseId = uuid();

      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(CREATE_EXPENSE, {
          id: expenseId,
          username,
          farmName: expenseData.farmName,
          amount: expenseData.amount,
          currency: expenseData.currency || 'USD',
          category: expenseData.category,
          subcategory: expenseData.subcategory || null,
          description: expenseData.description,
          date: expenseData.date,
          paymentMethod: expenseData.paymentMethod,
          vendor: expenseData.vendor || null,
          receiptUrl: expenseData.receiptUrl || null,
          isRecurring: expenseData.isRecurring || false,
          recurringFrequency: expenseData.recurringFrequency || null,
          tags: expenseData.tags || [],
          relatedAssets: expenseData.relatedAssets || [],
          taxDeductible: expenseData.taxDeductible ?? true,
          businessExpense: expenseData.businessExpense ?? true
        })
      );

      if (result.records.length === 0) {
        return { success: "", error: "Failed to create expense record" };
      }

      const createdExpense = result.records[0].get('e').properties;

      return {
        success: "Expense record created successfully",
        expense: {
          ...createdExpense,
          id: expenseId
        }
      } as SuccessMessage & { expense: Expense };

    } catch (error: any) {
      console.error("Error creating expense:", error);
      return { success: "", error: `Failed to create expense: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Update an existing expense record
   */
  public async updateExpense(token: string, farmName: string, expenseId: string, updateData: Partial<ExpenseRequest>): Promise<SuccessMessage> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(UPDATE_EXPENSE, {
          expenseId,
          username,
          farmName,
          ...updateData
        })
      );

      if (result.records.length === 0) {
        return { success: "", error: "Expense not found or access denied" };
      }

      return { success: "Expense updated successfully" };

    } catch (error: any) {
      console.error("Error updating expense:", error);
      return { success: "", error: `Failed to update expense: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Delete an expense record
   */
  public async deleteExpense(token: string, farmName: string, expenseId: string): Promise<SuccessMessage> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(DELETE_EXPENSE, {
          expenseId,
          username,
          farmName
        })
      );

      const deletedCount = result.records[0]?.get('deletedCount')?.toNumber() || 0;

      if (deletedCount === 0) {
        return { success: "", error: "Expense not found or access denied" };
      }

      return { success: "Expense deleted successfully" };

    } catch (error: any) {
      console.error("Error deleting expense:", error);
      return { success: "", error: `Failed to delete expense: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Get a specific expense by ID
   */
  public async getExpenseById(token: string, farmName: string, expenseId: string): Promise<FinancialResponse> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(GET_EXPENSE_BY_ID, {
          expenseId,
          username,
          farmName
        })
      );

      if (result.records.length === 0) {
        return { error: "Expense not found" };
      }

      const expense = result.records[0].get('expense');

      return {
        success: "Expense retrieved successfully",
        data: expense
      };

    } catch (error: any) {
      console.error("Error retrieving expense:", error);
      return { error: `Failed to retrieve expense: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Get expenses with filtering and pagination
   */
  public async getExpenses(token: string, farmName: string, queryParams: any): Promise<ExpenseListResponse> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);
      
      const page = queryParams.page || 1;
      const limit = queryParams.limit || 20;
      const skip = (page - 1) * limit;

      const result = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(GET_EXPENSES, {
          username,
          farmName,
          startDate: queryParams.startDate || null,
          endDate: queryParams.endDate || null,
          category: queryParams.category || null,
          paymentMethod: queryParams.paymentMethod || null,
          minAmount: queryParams.minAmount || null,
          maxAmount: queryParams.maxAmount || null,
          vendor: queryParams.vendor || null,
          tags: queryParams.tags || null,
          taxDeductible: queryParams.taxDeductible || null,
          sortBy: queryParams.sortBy || 'createdAt',
          sortOrder: queryParams.sortOrder || 'desc',
          skip,
          limit
        })
      );

      const expenses = result.records.map(record => record.get('expense'));
      const totalCount = result.records.length > 0 ? result.records[0].get('totalCount').toNumber() : 0;
      const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      // Calculate category breakdown
      const categoryBreakdown: Record<string, number> = {};
      expenses.forEach(expense => {
        categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
      });

      return {
        success: "Expenses retrieved successfully",
        expenses,
        totalAmount,
        categoryBreakdown,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };

    } catch (error: any) {
      console.error("Error retrieving expenses:", error);
      return { error: `Failed to retrieve expenses: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  // ========================
  // INCOME MANAGEMENT
  // ========================

  /**
   * Create a new income record
   */
  public async createIncome(token: string, incomeData: IncomeRequest): Promise<SuccessMessage> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);
      const incomeId = uuid();

      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(CREATE_INCOME, {
          id: incomeId,
          username,
          farmName: incomeData.farmName,
          amount: incomeData.amount,
          currency: incomeData.currency || 'USD',
          source: incomeData.source,
          cropType: incomeData.cropType || null,
          quantity: incomeData.quantity || null,
          unit: incomeData.unit || null,
          pricePerUnit: incomeData.pricePerUnit || null,
          buyer: incomeData.buyer || null,
          marketChannel: incomeData.marketChannel || 'direct',
          paymentStatus: incomeData.paymentStatus || 'pending',
          invoiceNumber: incomeData.invoiceNumber || null,
          date: incomeData.date,
          receivedDate: incomeData.receivedDate || null,
          description: incomeData.description || null,
          qualityGrade: incomeData.qualityGrade || null,
          certifications: incomeData.certifications || [],
          taxable: incomeData.taxable ?? true
        })
      );

      if (result.records.length === 0) {
        return { success: "", error: "Failed to create income record" };
      }

      return {
        success: "Income record created successfully",
        income: {
          id: incomeId,
          ...incomeData
        }
      } as SuccessMessage & { income: Income };

    } catch (error: any) {
      console.error("Error creating income:", error);
      return { success: "", error: `Failed to create income: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Update an existing income record
   */
  public async updateIncome(token: string, farmName: string, incomeId: string, updateData: Partial<IncomeRequest>): Promise<SuccessMessage> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(UPDATE_INCOME, {
          incomeId,
          username,
          farmName,
          ...updateData
        })
      );

      if (result.records.length === 0) {
        return { success: "", error: "Income not found or access denied" };
      }

      return { success: "Income updated successfully" };

    } catch (error: any) {
      console.error("Error updating income:", error);
      return { success: "", error: `Failed to update income: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Delete an income record
   */
  public async deleteIncome(token: string, farmName: string, incomeId: string): Promise<SuccessMessage> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(DELETE_INCOME, {
          incomeId,
          username,
          farmName
        })
      );

      const deletedCount = result.records[0]?.get('deletedCount')?.toNumber() || 0;

      if (deletedCount === 0) {
        return { success: "", error: "Income not found or access denied" };
      }

      return { success: "Income deleted successfully" };

    } catch (error: any) {
      console.error("Error deleting income:", error);
      return { success: "", error: `Failed to delete income: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Get income records with filtering and pagination
   */
  public async getIncome(token: string, farmName: string, queryParams: any): Promise<IncomeListResponse> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);
      
      const page = queryParams.page || 1;
      const limit = queryParams.limit || 20;
      const skip = (page - 1) * limit;

      const result = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(GET_INCOME_LIST, {
          username,
          farmName,
          startDate: queryParams.startDate || null,
          endDate: queryParams.endDate || null,
          source: queryParams.source || null,
          cropType: queryParams.cropType || null,
          marketChannel: queryParams.marketChannel || null,
          paymentStatus: queryParams.paymentStatus || null,
          minAmount: queryParams.minAmount || null,
          maxAmount: queryParams.maxAmount || null,
          buyer: queryParams.buyer || null,
          taxable: queryParams.taxable || null,
          sortBy: queryParams.sortBy || 'createdAt',
          sortOrder: queryParams.sortOrder || 'desc',
          skip,
          limit
        })
      );

      const income = result.records.map(record => record.get('income'));
      const totalCount = result.records.length > 0 ? result.records[0].get('totalCount').toNumber() : 0;
      const totalAmount = income.reduce((sum, inc) => sum + inc.amount, 0);

      // Calculate source breakdown
      const sourceBreakdown: Record<string, number> = {};
      income.forEach(inc => {
        sourceBreakdown[inc.source] = (sourceBreakdown[inc.source] || 0) + inc.amount;
      });

      return {
        success: "Income retrieved successfully",
        income,
        totalAmount,
        sourceBreakdown,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };

    } catch (error: any) {
      console.error("Error retrieving income:", error);
      return { error: `Failed to retrieve income: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  // ========================
  // BUDGET MANAGEMENT
  // ========================

  /**
   * Create a new budget
   */
  public async createBudget(token: string, budgetData: BudgetRequest): Promise<SuccessMessage> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);
      const budgetId = uuid();

      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(CREATE_BUDGET, {
          id: budgetId,
          username,
          farmName: budgetData.farmName,
          name: budgetData.name,
          description: budgetData.description || null,
          period: budgetData.period,
          startDate: budgetData.startDate,
          endDate: budgetData.endDate,
          totalBudget: budgetData.totalBudget,
          currency: budgetData.currency || 'USD',
          categories: budgetData.categories
        })
      );

      if (result.records.length === 0) {
        return { success: "", error: "Failed to create budget" };
      }

      return {
        success: "Budget created successfully",
        budget: {
          id: budgetId,
          ...budgetData
        }
      } as SuccessMessage & { budget: Budget };

    } catch (error: any) {
      console.error("Error creating budget:", error);
      return { success: "", error: `Failed to create budget: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Get budget by ID with current spending calculations
   */
  public async getBudgetById(token: string, farmName: string, budgetId: string): Promise<FinancialResponse> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(GET_BUDGET_BY_ID, {
          budgetId,
          username,
          farmName
        })
      );

      if (result.records.length === 0) {
        return { error: "Budget not found" };
      }

      const budget = result.records[0].get('budget');

      return {
        success: "Budget retrieved successfully",
        data: budget
      };

    } catch (error: any) {
      console.error("Error retrieving budget:", error);
      return { error: `Failed to retrieve budget: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Get all budgets for a farm
   */
  public async getFarmBudgets(token: string, farmName: string): Promise<FinancialResponse> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(GET_FARM_BUDGETS, {
          username,
          farmName
        })
      );

      const budgets = result.records.map(record => record.get('budget'));

      return {
        success: "Budgets retrieved successfully",
        data: budgets
      };

    } catch (error: any) {
      console.error("Error retrieving budgets:", error);
      return { error: `Failed to retrieve budgets: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  // ========================
  // LOAN MANAGEMENT
  // ========================

  /**
   * Create a new loan record
   */
  public async createLoan(token: string, loanData: LoanRequest): Promise<SuccessMessage> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);
      const loanId = uuid();

      // Calculate monthly payment and maturity date
      const monthlyPayment = this.calculateMonthlyPayment(
        loanData.principalAmount,
        loanData.interestRate,
        loanData.termMonths
      );

      const startDate = new Date(loanData.startDate);
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + loanData.termMonths);

      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(CREATE_LOAN, {
          id: loanId,
          username,
          farmName: loanData.farmName,
          loanType: loanData.loanType,
          lender: loanData.lender,
          principalAmount: loanData.principalAmount,
          currency: loanData.currency || 'USD',
          interestRate: loanData.interestRate,
          termMonths: loanData.termMonths,
          monthlyPayment,
          startDate: loanData.startDate,
          maturityDate: maturityDate.toISOString().split('T')[0],
          purpose: loanData.purpose,
          collateral: loanData.collateral || null
        })
      );

      if (result.records.length === 0) {
        return { success: "", error: "Failed to create loan record" };
      }

      return {
        success: "Loan record created successfully",
        loan: {
          id: loanId,
          ...loanData,
          monthlyPayment
        }
      } as SuccessMessage & { loan: Loan };

    } catch (error: any) {
      console.error("Error creating loan:", error);
      return { success: "", error: `Failed to create loan: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Record a loan payment
   */
  public async recordLoanPayment(token: string, farmName: string, loanId: string, paymentData: any): Promise<SuccessMessage> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);
      const paymentId = uuid();

      // Get loan details to calculate interest/principal split
      const loanResult = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(GET_LOAN_BY_ID, { loanId, username, farmName })
      );

      if (loanResult.records.length === 0) {
        return { success: "", error: "Loan not found" };
      }

      const loan = loanResult.records[0].get('loan');
      const { principalAmount, interestAmount } = this.calculatePaymentSplit(
        paymentData.amount,
        loan.remainingBalance,
        loan.interestRate
      );

      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(CREATE_LOAN_PAYMENT, {
          paymentId,
          loanId,
          username,
          farmName,
          paymentDate: paymentData.paymentDate,
          amount: paymentData.amount,
          principalAmount,
          interestAmount,
          paymentMethod: paymentData.paymentMethod,
          lateFee: paymentData.lateFee || 0
        })
      );

      return { success: "Loan payment recorded successfully" };

    } catch (error: any) {
      console.error("Error recording loan payment:", error);
      return { success: "", error: `Failed to record loan payment: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  // ========================
  // FINANCIAL ANALYTICS
  // ========================

  /**
   * Get comprehensive financial summary
   */
  public async getFinancialSummary(token: string, farmName: string, startDate: string, endDate: string): Promise<FinancialResponse> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(GET_FINANCIAL_SUMMARY, {
          username,
          farmName,
          startDate,
          endDate,
          currency: 'USD'
        })
      );

      if (result.records.length === 0) {
        return { error: "No financial data found for the specified period" };
      }

      const summary = result.records[0].get('summary');

      return {
        success: "Financial summary retrieved successfully",
        data: summary
      };

    } catch (error: any) {
      console.error("Error retrieving financial summary:", error);
      return { error: `Failed to retrieve financial summary: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  /**
   * Get farm financial overview
   */
  public async getFarmFinancialOverview(token: string, farmName: string): Promise<FinancialResponse> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(GET_FARM_FINANCIAL_OVERVIEW, {
          username,
          farmName
        })
      );

      if (result.records.length === 0) {
        return { error: "Farm not found or no financial data available" };
      }

      const overview = result.records[0].get('overview');

      return {
        success: "Farm financial overview retrieved successfully",
        data: overview
      };

    } catch (error: any) {
      console.error("Error retrieving farm financial overview:", error);
      return { error: `Failed to retrieve farm financial overview: ${error.message}` };
    } finally {
      await session?.close();
    }
  }

  // ========================
  // UTILITY METHODS
  // ========================

  /**
   * Calculate monthly payment for a loan
   */
  private calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return principal / termMonths;
    
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                          (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    return Math.round(monthlyPayment * 100) / 100;
  }

  /**
   * Calculate interest vs principal split for loan payment
   */
  private calculatePaymentSplit(paymentAmount: number, remainingBalance: number, annualRate: number): { principalAmount: number; interestAmount: number } {
    const monthlyRate = annualRate / 100 / 12;
    const interestAmount = remainingBalance * monthlyRate;
    const principalAmount = paymentAmount - interestAmount;

    return {
      principalAmount: Math.max(0, principalAmount),
      interestAmount: Math.max(0, interestAmount)
    };
  }

  /**
   * Generate cash flow projection
   */
  public async generateCashFlowProjection(token: string, farmName: string, projectionMonths: number): Promise<FinancialResponse> {
    const session: Session | undefined = this.driver?.session();
    if (!session) throw new Error("Unable to create database session.");

    try {
      const username = await this.tokenService.verifyAccessToken(token);

      const result = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(GET_CASH_FLOW_PROJECTION, {
          username,
          farmName,
          projectionMonths
        })
      );

      if (result.records.length === 0) {
        return { error: "Insufficient historical data for projection" };
      }

      const projection = result.records[0].get('projection');

      return {
        success: "Cash flow projection generated successfully",
        data: projection
      };

    } catch (error: any) {
      console.error("Error generating cash flow projection:", error);
      return { error: `Failed to generate cash flow projection: ${error.message}` };
    } finally {
      await session?.close();
    }
  }
}

export default FinancialService;
