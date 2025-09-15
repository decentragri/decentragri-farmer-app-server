import { t } from "elysia";

/**
 * Financial Services Validation Schemas
 * Comprehensive data validation for agricultural financial management
 */

// ========================
// COMMON SCHEMAS
// ========================

export const CurrencySchema = t.Optional(t.String({ 
  default: 'USD',
  pattern: '^[A-Z]{3}$',
  description: 'Three-letter currency code (ISO 4217)'
}));

export const PositiveAmountSchema = t.Number({ 
  minimum: 0.01,
  description: 'Positive monetary amount'
});

export const DateSchema = t.String({
  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  description: 'Date in YYYY-MM-DD format'
});

export const TimestampSchema = t.String({
  pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}',
  description: 'ISO 8601 timestamp'
});

// ========================
// EXPENSE MANAGEMENT SCHEMAS
// ========================

export const ExpenseCategoryEnum = t.Union([
  t.Literal('seeds_plants'),
  t.Literal('fertilizers'),
  t.Literal('pesticides'),
  t.Literal('equipment'),
  t.Literal('fuel'),
  t.Literal('labor'),
  t.Literal('utilities'),
  t.Literal('insurance'),
  t.Literal('maintenance'),
  t.Literal('transportation'),
  t.Literal('storage'),
  t.Literal('professional_services'),
  t.Literal('taxes_fees'),
  t.Literal('other')
]);

export const PaymentMethodEnum = t.Union([
  t.Literal('cash'),
  t.Literal('credit_card'),
  t.Literal('bank_transfer'),
  t.Literal('check'),
  t.Literal('loan')
]);

export const RecurringFrequencyEnum = t.Union([
  t.Literal('weekly'),
  t.Literal('monthly'),
  t.Literal('quarterly'),
  t.Literal('annually')
]);

export const ExpenseRequestSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  amount: PositiveAmountSchema,
  currency: CurrencySchema,
  category: ExpenseCategoryEnum,
  subcategory: t.Optional(t.String({ maxLength: 100 })),
  description: t.String({ minLength: 3, maxLength: 500 }),
  date: DateSchema,
  paymentMethod: PaymentMethodEnum,
  vendor: t.Optional(t.String({ maxLength: 200 })),
  receiptUrl: t.Optional(t.String({ format: 'uri' })),
  isRecurring: t.Optional(t.Boolean({ default: false })),
  recurringFrequency: t.Optional(RecurringFrequencyEnum),
  tags: t.Optional(t.Array(t.String({ maxLength: 50 }))),
  relatedAssets: t.Optional(t.Array(t.String({ maxLength: 100 }))),
  taxDeductible: t.Optional(t.Boolean({ default: true })),
  businessExpense: t.Optional(t.Boolean({ default: true }))
});

export const ExpenseUpdateSchema = t.Object({
  amount: t.Optional(PositiveAmountSchema),
  category: t.Optional(ExpenseCategoryEnum),
  subcategory: t.Optional(t.String({ maxLength: 100 })),
  description: t.Optional(t.String({ minLength: 3, maxLength: 500 })),
  date: t.Optional(DateSchema),
  paymentMethod: t.Optional(PaymentMethodEnum),
  vendor: t.Optional(t.String({ maxLength: 200 })),
  receiptUrl: t.Optional(t.String({ format: 'uri' })),
  tags: t.Optional(t.Array(t.String({ maxLength: 50 }))),
  relatedAssets: t.Optional(t.Array(t.String({ maxLength: 100 }))),
  taxDeductible: t.Optional(t.Boolean()),
  businessExpense: t.Optional(t.Boolean())
});

export const ExpenseQuerySchema = t.Object({
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
  startDate: t.Optional(DateSchema),
  endDate: t.Optional(DateSchema),
  category: t.Optional(ExpenseCategoryEnum),
  paymentMethod: t.Optional(PaymentMethodEnum),
  minAmount: t.Optional(t.Number({ minimum: 0 })),
  maxAmount: t.Optional(t.Number({ minimum: 0 })),
  vendor: t.Optional(t.String({ maxLength: 200 })),
  tags: t.Optional(t.String({ description: 'Comma-separated tags' })),
  taxDeductible: t.Optional(t.Boolean()),
  sortBy: t.Optional(t.Union([
    t.Literal('date'),
    t.Literal('amount'),
    t.Literal('category'),
    t.Literal('createdAt')
  ])),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')]))
});

// ========================
// INCOME MANAGEMENT SCHEMAS
// ========================

export const IncomeSourceEnum = t.Union([
  t.Literal('crop_sales'),
  t.Literal('livestock_sales'),
  t.Literal('equipment_rental'),
  t.Literal('subsidies'),
  t.Literal('insurance_payout'),
  t.Literal('other')
]);

export const MarketChannelEnum = t.Union([
  t.Literal('direct'),
  t.Literal('wholesale'),
  t.Literal('retail'),
  t.Literal('contract'),
  t.Literal('commodity_exchange')
]);

export const PaymentStatusEnum = t.Union([
  t.Literal('pending'),
  t.Literal('partial'),
  t.Literal('paid'),
  t.Literal('overdue')
]);

export const IncomeRequestSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  amount: PositiveAmountSchema,
  currency: CurrencySchema,
  source: IncomeSourceEnum,
  cropType: t.Optional(t.String({ maxLength: 100 })),
  quantity: t.Optional(t.Number({ minimum: 0 })),
  unit: t.Optional(t.String({ maxLength: 50 })),
  pricePerUnit: t.Optional(t.Number({ minimum: 0 })),
  buyer: t.Optional(t.String({ maxLength: 200 })),
  marketChannel: t.Optional(MarketChannelEnum),
  paymentStatus: t.Optional(PaymentStatusEnum),
  invoiceNumber: t.Optional(t.String({ maxLength: 100 })),
  date: DateSchema,
  receivedDate: t.Optional(DateSchema),
  description: t.Optional(t.String({ maxLength: 500 })),
  qualityGrade: t.Optional(t.String({ maxLength: 50 })),
  certifications: t.Optional(t.Array(t.String({ maxLength: 100 }))),
  taxable: t.Optional(t.Boolean({ default: true }))
});

export const IncomeUpdateSchema = t.Object({
  amount: t.Optional(PositiveAmountSchema),
  source: t.Optional(IncomeSourceEnum),
  cropType: t.Optional(t.String({ maxLength: 100 })),
  quantity: t.Optional(t.Number({ minimum: 0 })),
  unit: t.Optional(t.String({ maxLength: 50 })),
  pricePerUnit: t.Optional(t.Number({ minimum: 0 })),
  buyer: t.Optional(t.String({ maxLength: 200 })),
  marketChannel: t.Optional(MarketChannelEnum),
  paymentStatus: t.Optional(PaymentStatusEnum),
  invoiceNumber: t.Optional(t.String({ maxLength: 100 })),
  date: t.Optional(DateSchema),
  receivedDate: t.Optional(DateSchema),
  description: t.Optional(t.String({ maxLength: 500 })),
  qualityGrade: t.Optional(t.String({ maxLength: 50 })),
  certifications: t.Optional(t.Array(t.String({ maxLength: 100 }))),
  taxable: t.Optional(t.Boolean())
});

export const IncomeQuerySchema = t.Object({
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
  startDate: t.Optional(DateSchema),
  endDate: t.Optional(DateSchema),
  source: t.Optional(IncomeSourceEnum),
  cropType: t.Optional(t.String({ maxLength: 100 })),
  marketChannel: t.Optional(MarketChannelEnum),
  paymentStatus: t.Optional(PaymentStatusEnum),
  minAmount: t.Optional(t.Number({ minimum: 0 })),
  maxAmount: t.Optional(t.Number({ minimum: 0 })),
  buyer: t.Optional(t.String({ maxLength: 200 })),
  taxable: t.Optional(t.Boolean()),
  sortBy: t.Optional(t.Union([
    t.Literal('date'),
    t.Literal('amount'),
    t.Literal('source'),
    t.Literal('createdAt')
  ])),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')]))
});

// ========================
// BUDGETING SCHEMAS
// ========================

export const BudgetPeriodEnum = t.Union([
  t.Literal('monthly'),
  t.Literal('quarterly'),
  t.Literal('annual'),
  t.Literal('seasonal'),
  t.Literal('custom')
]);

export const BudgetStatusEnum = t.Union([
  t.Literal('draft'),
  t.Literal('active'),
  t.Literal('completed'),
  t.Literal('archived')
]);

export const BudgetCategorySchema = t.Object({
  category: t.String({ maxLength: 100 }),
  allocatedAmount: PositiveAmountSchema,
  subcategories: t.Optional(t.Array(t.Object({
    name: t.String({ maxLength: 100 }),
    allocated: PositiveAmountSchema
  })))
});

export const BudgetRequestSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  name: t.String({ minLength: 3, maxLength: 200 }),
  description: t.Optional(t.String({ maxLength: 1000 })),
  period: BudgetPeriodEnum,
  startDate: DateSchema,
  endDate: DateSchema,
  totalBudget: PositiveAmountSchema,
  currency: CurrencySchema,
  categories: t.Array(BudgetCategorySchema, { minItems: 1 })
});

export const BudgetUpdateSchema = t.Object({
  name: t.Optional(t.String({ minLength: 3, maxLength: 200 })),
  description: t.Optional(t.String({ maxLength: 1000 })),
  totalBudget: t.Optional(PositiveAmountSchema),
  status: t.Optional(BudgetStatusEnum),
  categories: t.Optional(t.Array(BudgetCategorySchema))
});

// ========================
// LOAN MANAGEMENT SCHEMAS
// ========================

export const LoanTypeEnum = t.Union([
  t.Literal('operating'),
  t.Literal('equipment'),
  t.Literal('land'),
  t.Literal('construction'),
  t.Literal('emergency'),
  t.Literal('other')
]);

export const LoanStatusEnum = t.Union([
  t.Literal('applied'),
  t.Literal('approved'),
  t.Literal('active'),
  t.Literal('paid_off'),
  t.Literal('defaulted')
]);

export const LoanRequestSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  loanType: LoanTypeEnum,
  lender: t.String({ minLength: 2, maxLength: 200 }),
  principalAmount: PositiveAmountSchema,
  currency: CurrencySchema,
  interestRate: t.Number({ minimum: 0, maximum: 100 }),
  termMonths: t.Number({ minimum: 1, maximum: 480 }),
  startDate: DateSchema,
  purpose: t.String({ minLength: 10, maxLength: 1000 }),
  collateral: t.Optional(t.String({ maxLength: 500 }))
});

export const LoanUpdateSchema = t.Object({
  lender: t.Optional(t.String({ minLength: 2, maxLength: 200 })),
  interestRate: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
  status: t.Optional(LoanStatusEnum),
  purpose: t.Optional(t.String({ minLength: 10, maxLength: 1000 })),
  collateral: t.Optional(t.String({ maxLength: 500 }))
});

export const LoanPaymentSchema = t.Object({
  loanId: t.String({ minLength: 1 }),
  paymentDate: DateSchema,
  amount: PositiveAmountSchema,
  paymentMethod: PaymentMethodEnum,
  lateFee: t.Optional(t.Number({ minimum: 0 }))
});

// ========================
// INSURANCE SCHEMAS
// ========================

export const InsuranceTypeEnum = t.Union([
  t.Literal('crop'),
  t.Literal('livestock'),
  t.Literal('property'),
  t.Literal('liability'),
  t.Literal('equipment'),
  t.Literal('revenue')
]);

export const InsuranceStatusEnum = t.Union([
  t.Literal('active'),
  t.Literal('expired'),
  t.Literal('cancelled'),
  t.Literal('suspended')
]);

export const PaymentScheduleEnum = t.Union([
  t.Literal('monthly'),
  t.Literal('quarterly'),
  t.Literal('semi_annual'),
  t.Literal('annual')
]);

export const InsuranceCoverageSchema = t.Object({
  crops: t.Optional(t.Array(t.String({ maxLength: 100 }))),
  equipment: t.Optional(t.Array(t.String({ maxLength: 100 }))),
  buildings: t.Optional(t.Array(t.String({ maxLength: 100 }))),
  liabilityLimit: t.Optional(t.Number({ minimum: 0 })),
  businessInterruption: t.Optional(t.Boolean({ default: false }))
});

export const InsuranceRequestSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  policyType: InsuranceTypeEnum,
  provider: t.String({ minLength: 2, maxLength: 200 }),
  policyNumber: t.String({ minLength: 3, maxLength: 100 }),
  coverageAmount: PositiveAmountSchema,
  premium: PositiveAmountSchema,
  deductible: t.Number({ minimum: 0 }),
  currency: CurrencySchema,
  startDate: DateSchema,
  endDate: DateSchema,
  coverageDetails: InsuranceCoverageSchema,
  beneficiaries: t.Array(t.String({ maxLength: 200 }), { minItems: 1 }),
  paymentSchedule: t.Optional(PaymentScheduleEnum)
});

export const InsuranceUpdateSchema = t.Object({
  provider: t.Optional(t.String({ minLength: 2, maxLength: 200 })),
  coverageAmount: t.Optional(PositiveAmountSchema),
  premium: t.Optional(PositiveAmountSchema),
  deductible: t.Optional(t.Number({ minimum: 0 })),
  endDate: t.Optional(DateSchema),
  status: t.Optional(InsuranceStatusEnum),
  coverageDetails: t.Optional(InsuranceCoverageSchema),
  beneficiaries: t.Optional(t.Array(t.String({ maxLength: 200 }))),
  paymentSchedule: t.Optional(PaymentScheduleEnum)
});

export const ClaimStatusEnum = t.Union([
  t.Literal('reported'),
  t.Literal('investigating'),
  t.Literal('approved'),
  t.Literal('denied'),
  t.Literal('paid')
]);

export const InsuranceClaimSchema = t.Object({
  policyId: t.String({ minLength: 1 }),
  incidentDate: DateSchema,
  description: t.String({ minLength: 10, maxLength: 2000 }),
  estimatedLoss: PositiveAmountSchema,
  documentation: t.Array(t.String({ format: 'uri' }))
});

// ========================
// TAX MANAGEMENT SCHEMAS
// ========================

export const FilingStatusEnum = t.Union([
  t.Literal('individual'),
  t.Literal('corporation'),
  t.Literal('partnership'),
  t.Literal('llc')
]);

export const TaxStatusEnum = t.Union([
  t.Literal('in_progress'),
  t.Literal('filed'),
  t.Literal('amended'),
  t.Literal('audited')
]);

export const DepreciationMethodEnum = t.Union([
  t.Literal('straight_line'),
  t.Literal('declining_balance'),
  t.Literal('section_179')
]);

export const TaxDeductionSchema = t.Object({
  category: t.String({ maxLength: 100 }),
  description: t.String({ maxLength: 500 }),
  amount: PositiveAmountSchema,
  supportingDocuments: t.Array(t.String({ format: 'uri' })),
  eligibilityConfirmed: t.Boolean({ default: false })
});

export const DepreciationScheduleSchema = t.Object({
  assetType: t.String({ maxLength: 100 }),
  assetName: t.String({ maxLength: 200 }),
  purchaseDate: DateSchema,
  originalCost: PositiveAmountSchema,
  depreciationMethod: DepreciationMethodEnum,
  usefulLife: t.Number({ minimum: 1, maximum: 50 }),
  annualDepreciation: t.Number({ minimum: 0 }),
  accumulatedDepreciation: t.Number({ minimum: 0 }),
  bookValue: t.Number({ minimum: 0 })
});

// ========================
// ANALYTICS SCHEMAS
// ========================

export const AnalyticsQuerySchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  startDate: DateSchema,
  endDate: DateSchema,
  currency: CurrencySchema,
  includeBenchmarks: t.Optional(t.Boolean({ default: false })),
  includeProjections: t.Optional(t.Boolean({ default: false })),
  granularity: t.Optional(t.Union([
    t.Literal('daily'),
    t.Literal('weekly'),
    t.Literal('monthly'),
    t.Literal('quarterly')
  ]))
});

export const CashFlowProjectionSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  projectionMonths: t.Number({ minimum: 1, maximum: 24 }),
  includeBudgetConstraints: t.Optional(t.Boolean({ default: true })),
  includeSeasonalFactors: t.Optional(t.Boolean({ default: true })),
  riskTolerance: t.Optional(t.Union([
    t.Literal('conservative'),
    t.Literal('moderate'),
    t.Literal('aggressive')
  ]))
});

// ========================
// COMMON PARAMETER SCHEMAS
// ========================

export const FarmNameParamSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 })
});

export const ExpenseParamSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  expenseId: t.String({ minLength: 1 })
});

export const IncomeParamSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  incomeId: t.String({ minLength: 1 })
});

export const BudgetParamSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  budgetId: t.String({ minLength: 1 })
});

export const LoanParamSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  loanId: t.String({ minLength: 1 })
});

export const InsuranceParamSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  policyId: t.String({ minLength: 1 })
});

export const ClaimParamSchema = t.Object({
  farmName: t.String({ minLength: 2, maxLength: 100 }),
  policyId: t.String({ minLength: 1 }),
  claimId: t.String({ minLength: 1 })
});

// ========================
// RESPONSE SCHEMAS
// ========================

export const PaginationSchema = t.Object({
  page: t.Number({ minimum: 1 }),
  limit: t.Number({ minimum: 1, maximum: 100 }),
  total: t.Number({ minimum: 0 }),
  pages: t.Number({ minimum: 0 })
});

export const SuccessResponseSchema = t.Object({
  success: t.String(),
  error: t.Optional(t.String())
});

export const FinancialSummarySchema = t.Object({
  farmName: t.String(),
  period: t.Object({
    startDate: DateSchema,
    endDate: DateSchema
  }),
  currency: t.String(),
  revenue: t.Object({
    total: t.Number(),
    bySource: t.Record(t.String(), t.Number()),
    growth: t.Number()
  }),
  expenses: t.Object({
    total: t.Number(),
    byCategory: t.Record(t.String(), t.Number()),
    growth: t.Number()
  }),
  profitability: t.Object({
    grossProfit: t.Number(),
    netProfit: t.Number(),
    profitMargin: t.Number(),
    roi: t.Number()
  })
});

// Export all schemas for use in routes
export const FinancialSchemas = {
  // Request schemas
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
  
  // Parameter schemas
  FarmNameParamSchema,
  ExpenseParamSchema,
  IncomeParamSchema,
  BudgetParamSchema,
  LoanParamSchema,
  InsuranceParamSchema,
  ClaimParamSchema,
  
  // Response schemas
  SuccessResponseSchema,
  PaginationSchema,
  FinancialSummarySchema
};
