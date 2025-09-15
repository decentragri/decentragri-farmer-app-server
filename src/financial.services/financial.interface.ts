/**
 * Financial Services Interfaces
 * Comprehensive financial management for agricultural operations
 */

export interface FinancialRequest {
  farmName: string;
  token: string;
}

// ========================
// EXPENSE MANAGEMENT
// ========================

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  parentCategory?: string;
  isActive: boolean;
  farmSpecific: boolean;
}

export interface Expense {
  id: string;
  farmName: string;
  username: string;
  amount: number;
  currency: string;
  category: string;
  subcategory?: string;
  description: string;
  date: string;
  paymentMethod: 'cash' | 'credit_card' | 'bank_transfer' | 'check' | 'loan';
  vendor?: string;
  receiptUrl?: string;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  tags: string[];
  relatedAssets?: string[]; // Equipment, crops, etc.
  taxDeductible: boolean;
  businessExpense: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequest {
  farmName: string;
  amount: number;
  currency?: string;
  category: string;
  subcategory?: string;
  description: string;
  date: string;
  paymentMethod: 'cash' | 'credit_card' | 'bank_transfer' | 'check' | 'loan';
  vendor?: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  tags?: string[];
  relatedAssets?: string[];
  taxDeductible?: boolean;
  businessExpense?: boolean;
}

// ========================
// INCOME MANAGEMENT
// ========================

export interface Income {
  id: string;
  farmName: string;
  username: string;
  amount: number;
  currency: string;
  source: 'crop_sales' | 'livestock_sales' | 'equipment_rental' | 'subsidies' | 'insurance_payout' | 'other';
  cropType?: string;
  quantity?: number;
  unit?: string;
  pricePerUnit?: number;
  buyer?: string;
  marketChannel: 'direct' | 'wholesale' | 'retail' | 'contract' | 'commodity_exchange';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  invoiceNumber?: string;
  date: string;
  receivedDate?: string;
  description?: string;
  qualityGrade?: string;
  certifications?: string[];
  taxable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeRequest {
  farmName: string;
  amount: number;
  currency?: string;
  source: 'crop_sales' | 'livestock_sales' | 'equipment_rental' | 'subsidies' | 'insurance_payout' | 'other';
  cropType?: string;
  quantity?: number;
  unit?: string;
  pricePerUnit?: number;
  buyer?: string;
  marketChannel?: 'direct' | 'wholesale' | 'retail' | 'contract' | 'commodity_exchange';
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'overdue';
  invoiceNumber?: string;
  date: string;
  receivedDate?: string;
  description?: string;
  qualityGrade?: string;
  certifications?: string[];
  taxable?: boolean;
}

// ========================
// BUDGETING & PLANNING
// ========================

export interface Budget {
  id: string;
  farmName: string;
  username: string;
  name: string;
  description?: string;
  period: 'monthly' | 'quarterly' | 'annual' | 'seasonal' | 'custom';
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  categories: BudgetCategory[];
  actualSpent: number;
  remainingBudget: number;
  utilizationPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  subcategories?: {
    name: string;
    allocated: number;
    spent: number;
  }[];
}

export interface BudgetRequest {
  farmName: string;
  name: string;
  description?: string;
  period: 'monthly' | 'quarterly' | 'annual' | 'seasonal' | 'custom';
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency?: string;
  categories: {
    category: string;
    allocatedAmount: number;
    subcategories?: {
      name: string;
      allocated: number;
    }[];
  }[];
}

// ========================
// LOANS & CREDIT
// ========================

export interface Loan {
  id: string;
  farmName: string;
  username: string;
  loanType: 'operating' | 'equipment' | 'land' | 'construction' | 'emergency' | 'other';
  lender: string;
  principalAmount: number;
  currency: string;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  startDate: string;
  maturityDate: string;
  purpose: string;
  collateral?: string;
  status: 'applied' | 'approved' | 'active' | 'paid_off' | 'defaulted';
  remainingBalance: number;
  nextPaymentDate: string;
  paymentsCount: number;
  remainingPayments: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  paymentDate: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
  paymentMethod: string;
  status: 'scheduled' | 'paid' | 'late' | 'missed';
  lateFee?: number;
}

export interface LoanRequest {
  farmName: string;
  loanType: 'operating' | 'equipment' | 'land' | 'construction' | 'emergency' | 'other';
  lender: string;
  principalAmount: number;
  currency?: string;
  interestRate: number;
  termMonths: number;
  startDate: string;
  purpose: string;
  collateral?: string;
}

// ========================
// INSURANCE
// ========================

export interface InsurancePolicy {
  id: string;
  farmName: string;
  username: string;
  policyType: 'crop' | 'livestock' | 'property' | 'liability' | 'equipment' | 'revenue';
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  premium: number;
  deductible: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  coverageDetails: {
    crops?: string[];
    equipment?: string[];
    buildings?: string[];
    liabilityLimit?: number;
    businessInterruption?: boolean;
  };
  beneficiaries: string[];
  paymentSchedule: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  nextPaymentDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  claimNumber: string;
  incidentDate: string;
  reportedDate: string;
  description: string;
  estimatedLoss: number;
  claimAmount: number;
  status: 'reported' | 'investigating' | 'approved' | 'denied' | 'paid';
  adjustorName?: string;
  documentation: string[];
  payoutAmount?: number;
  payoutDate?: string;
  appealDeadline?: string;
}

export interface InsuranceRequest {
  farmName: string;
  policyType: 'crop' | 'livestock' | 'property' | 'liability' | 'equipment' | 'revenue';
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  premium: number;
  deductible: number;
  currency?: string;
  startDate: string;
  endDate: string;
  coverageDetails: {
    crops?: string[];
    equipment?: string[];
    buildings?: string[];
    liabilityLimit?: number;
    businessInterruption?: boolean;
  };
  beneficiaries: string[];
  paymentSchedule?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
}

// ========================
// TAX MANAGEMENT
// ========================

export interface TaxRecord {
  id: string;
  farmName: string;
  username: string;
  taxYear: number;
  totalRevenue: number;
  totalDeductibleExpenses: number;
  netIncome: number;
  currency: string;
  filingStatus: 'individual' | 'corporation' | 'partnership' | 'llc';
  deductions: TaxDeduction[];
  depreciation: DepreciationSchedule[];
  estimatedTaxOwed: number;
  quarterliesPaid: number;
  refundDue?: number;
  filingDate?: string;
  status: 'in_progress' | 'filed' | 'amended' | 'audited';
  preparerInfo?: {
    name: string;
    license: string;
    contact: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaxDeduction {
  category: string;
  description: string;
  amount: number;
  supportingDocuments: string[];
  eligibilityConfirmed: boolean;
}

export interface DepreciationSchedule {
  assetType: string;
  assetName: string;
  purchaseDate: string;
  originalCost: number;
  depreciationMethod: 'straight_line' | 'declining_balance' | 'section_179';
  usefulLife: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

// ========================
// FINANCIAL ANALYTICS
// ========================

export interface FinancialSummary {
  farmName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  currency: string;
  revenue: {
    total: number;
    bySource: Record<string, number>;
    growth: number; // Percentage
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
    growth: number; // Percentage
  };
  profitability: {
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    roi: number; // Return on investment
  };
  cashFlow: {
    operating: number;
    investing: number;
    financing: number;
    netCashFlow: number;
  };
  ratios: {
    currentRatio: number;
    debtToEquity: number;
    assetTurnover: number;
    profitPerAcre: number;
  };
  benchmarks: {
    industryAverage: number;
    topPerformers: number;
    farmRanking: number; // Percentile
  };
}

export interface CashFlowProjection {
  farmName: string;
  projectionPeriod: string;
  monthlyProjections: MonthlyProjection[];
  seasonalFactors: {
    plantingSeason: { months: string[]; cashOutflow: number };
    growingSeason: { months: string[]; maintenanceCosts: number };
    harvestSeason: { months: string[]; cashInflow: number };
    dormantSeason: { months: string[]; reducedActivity: number };
  };
  riskFactors: string[];
  recommendations: string[];
}

export interface MonthlyProjection {
  month: string;
  expectedIncome: number;
  expectedExpenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  confidence: number; // 0-100
}

// ========================
// RESPONSES
// ========================

export interface FinancialResponse {
  success?: string;
  error?: string;
  data?: any;
}

export interface ExpenseListResponse extends FinancialResponse {
  expenses?: Expense[];
  totalAmount?: number;
  categoryBreakdown?: Record<string, number>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface IncomeListResponse extends FinancialResponse {
  income?: Income[];
  totalAmount?: number;
  sourceBreakdown?: Record<string, number>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BudgetResponse extends FinancialResponse {
  budget?: Budget;
}

export interface FinancialAnalyticsResponse extends FinancialResponse {
  summary?: FinancialSummary;
  cashFlowProjection?: CashFlowProjection;
  trends?: {
    revenueGrowth: number[];
    expenseGrowth: number[];
    profitTrend: number[];
  };
}

// ========================
// SUCCESS MESSAGE TYPES
// ========================

export interface SuccessMessage {
  success: string;
  error?: string;
}

export interface ExpenseSuccessMessage extends SuccessMessage {
  expense?: Expense;
}

export interface IncomeSuccessMessage extends SuccessMessage {
  income?: Income;
}

export interface BudgetSuccessMessage extends SuccessMessage {
  budget?: Budget;
}

export interface LoanSuccessMessage extends SuccessMessage {
  loan?: Loan;
}

export interface InsuranceSuccessMessage extends SuccessMessage {
  policy?: InsurancePolicy;
}
