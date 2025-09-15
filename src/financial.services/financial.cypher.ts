/**
 * Financial Services Cypher Queries
 * Database operations for agricultural financial management
 */

// ========================
// EXPENSE MANAGEMENT QUERIES
// ========================

export const CREATE_EXPENSE = `
CREATE (e:Expense {
  id: $id,
  farmName: $farmName,
  username: $username,
  amount: $amount,
  currency: $currency,
  category: $category,
  subcategory: $subcategory,
  description: $description,
  date: date($date),
  paymentMethod: $paymentMethod,
  vendor: $vendor,
  receiptUrl: $receiptUrl,
  isRecurring: $isRecurring,
  recurringFrequency: $recurringFrequency,
  tags: $tags,
  relatedAssets: $relatedAssets,
  taxDeductible: $taxDeductible,
  businessExpense: $businessExpense,
  createdAt: datetime(),
  updatedAt: datetime()
})

// Connect to farm
WITH e
MATCH (f:Farm {farmName: $farmName, username: $username})
CREATE (f)-[:HAS_EXPENSE]->(e)

// Connect to user
WITH e
MATCH (u:User {username: $username})
CREATE (u)-[:TRACKS_EXPENSE]->(e)

RETURN e
`;

export const UPDATE_EXPENSE = `
MATCH (e:Expense {id: $expenseId, farmName: $farmName, username: $username})
SET 
  e.amount = COALESCE($amount, e.amount),
  e.category = COALESCE($category, e.category),
  e.subcategory = COALESCE($subcategory, e.subcategory),
  e.description = COALESCE($description, e.description),
  e.date = COALESCE(date($date), e.date),
  e.paymentMethod = COALESCE($paymentMethod, e.paymentMethod),
  e.vendor = COALESCE($vendor, e.vendor),
  e.receiptUrl = COALESCE($receiptUrl, e.receiptUrl),
  e.tags = COALESCE($tags, e.tags),
  e.relatedAssets = COALESCE($relatedAssets, e.relatedAssets),
  e.taxDeductible = COALESCE($taxDeductible, e.taxDeductible),
  e.businessExpense = COALESCE($businessExpense, e.businessExpense),
  e.updatedAt = datetime()
RETURN e
`;

export const DELETE_EXPENSE = `
MATCH (e:Expense {id: $expenseId, farmName: $farmName, username: $username})
DETACH DELETE e
RETURN count(e) as deletedCount
`;

export const GET_EXPENSE_BY_ID = `
MATCH (e:Expense {id: $expenseId, farmName: $farmName, username: $username})
RETURN e {
  .*,
  date: toString(e.date),
  createdAt: toString(e.createdAt),
  updatedAt: toString(e.updatedAt)
} as expense
`;

export const GET_EXPENSES = `
MATCH (e:Expense {farmName: $farmName, username: $username})

// Apply filters
WHERE 
  ($startDate IS NULL OR e.date >= date($startDate)) AND
  ($endDate IS NULL OR e.date <= date($endDate)) AND
  ($category IS NULL OR e.category = $category) AND
  ($paymentMethod IS NULL OR e.paymentMethod = $paymentMethod) AND
  ($minAmount IS NULL OR e.amount >= $minAmount) AND
  ($maxAmount IS NULL OR e.amount <= $maxAmount) AND
  ($vendor IS NULL OR toLower(e.vendor) CONTAINS toLower($vendor)) AND
  ($taxDeductible IS NULL OR e.taxDeductible = $taxDeductible)

// Apply tag filter if provided
WITH e
WHERE $tags IS NULL OR any(tag IN split($tags, ',') WHERE tag IN e.tags)

// Calculate total count for pagination
WITH collect(e) as allExpenses, count(e) as totalCount

// Apply sorting
WITH allExpenses, totalCount,
  CASE $sortBy
    WHEN 'date' THEN [expense IN allExpenses | [expense.date, expense]]
    WHEN 'amount' THEN [expense IN allExpenses | [expense.amount, expense]]
    WHEN 'category' THEN [expense IN allExpenses | [expense.category, expense]]
    ELSE [expense IN allExpenses | [expense.createdAt, expense]]
  END as sortedPairs

WITH totalCount,
  CASE $sortOrder
    WHEN 'desc' THEN [pair IN sortedPairs | pair[1]] 
    ELSE reverse([pair IN sortedPairs | pair[1]])
  END as sortedExpenses

// Apply pagination
WITH totalCount, sortedExpenses[$skip..$skip + $limit] as paginatedExpenses

UNWIND paginatedExpenses as e
RETURN e {
  .*,
  date: toString(e.date),
  createdAt: toString(e.createdAt),
  updatedAt: toString(e.updatedAt)
} as expense, totalCount

ORDER BY 
  CASE $sortBy WHEN 'date' THEN e.date END,
  CASE $sortBy WHEN 'amount' THEN e.amount END,
  CASE $sortBy WHEN 'category' THEN e.category END,
  e.createdAt
`;

export const GET_EXPENSE_SUMMARY = `
MATCH (e:Expense {farmName: $farmName, username: $username})
WHERE e.date >= date($startDate) AND e.date <= date($endDate)

RETURN {
  totalAmount: sum(e.amount),
  totalCount: count(e),
  averageAmount: avg(e.amount),
  categoryBreakdown: apoc.map.groupByMulti(
    collect({category: e.category, amount: e.amount}), 
    'category'
  ),
  monthlyTrends: collect(DISTINCT {
    month: toString(e.date)[0..7],
    amount: sum(e.amount)
  }),
  taxDeductibleTotal: sum(CASE WHEN e.taxDeductible THEN e.amount ELSE 0 END),
  businessExpenseTotal: sum(CASE WHEN e.businessExpense THEN e.amount ELSE 0 END)
} as summary
`;

// ========================
// INCOME MANAGEMENT QUERIES
// ========================

export const CREATE_INCOME = `
CREATE (i:Income {
  id: $id,
  farmName: $farmName,
  username: $username,
  amount: $amount,
  currency: $currency,
  source: $source,
  cropType: $cropType,
  quantity: $quantity,
  unit: $unit,
  pricePerUnit: $pricePerUnit,
  buyer: $buyer,
  marketChannel: $marketChannel,
  paymentStatus: $paymentStatus,
  invoiceNumber: $invoiceNumber,
  date: date($date),
  receivedDate: CASE WHEN $receivedDate IS NOT NULL THEN date($receivedDate) ELSE null END,
  description: $description,
  qualityGrade: $qualityGrade,
  certifications: $certifications,
  taxable: $taxable,
  createdAt: datetime(),
  updatedAt: datetime()
})

// Connect to farm
WITH i
MATCH (f:Farm {farmName: $farmName, username: $username})
CREATE (f)-[:HAS_INCOME]->(i)

// Connect to user
WITH i
MATCH (u:User {username: $username})
CREATE (u)-[:EARNS_INCOME]->(i)

// Connect to crop if applicable
WITH i
OPTIONAL MATCH (c:Crop {cropType: $cropType})
FOREACH (crop IN CASE WHEN c IS NOT NULL THEN [c] ELSE [] END |
  CREATE (i)-[:FROM_CROP]->(crop)
)

RETURN i
`;

export const UPDATE_INCOME = `
MATCH (i:Income {id: $incomeId, farmName: $farmName, username: $username})
SET 
  i.amount = COALESCE($amount, i.amount),
  i.source = COALESCE($source, i.source),
  i.cropType = COALESCE($cropType, i.cropType),
  i.quantity = COALESCE($quantity, i.quantity),
  i.unit = COALESCE($unit, i.unit),
  i.pricePerUnit = COALESCE($pricePerUnit, i.pricePerUnit),
  i.buyer = COALESCE($buyer, i.buyer),
  i.marketChannel = COALESCE($marketChannel, i.marketChannel),
  i.paymentStatus = COALESCE($paymentStatus, i.paymentStatus),
  i.invoiceNumber = COALESCE($invoiceNumber, i.invoiceNumber),
  i.date = COALESCE(date($date), i.date),
  i.receivedDate = COALESCE(date($receivedDate), i.receivedDate),
  i.description = COALESCE($description, i.description),
  i.qualityGrade = COALESCE($qualityGrade, i.qualityGrade),
  i.certifications = COALESCE($certifications, i.certifications),
  i.taxable = COALESCE($taxable, i.taxable),
  i.updatedAt = datetime()
RETURN i
`;

export const DELETE_INCOME = `
MATCH (i:Income {id: $incomeId, farmName: $farmName, username: $username})
DETACH DELETE i
RETURN count(i) as deletedCount
`;

export const GET_INCOME_BY_ID = `
MATCH (i:Income {id: $incomeId, farmName: $farmName, username: $username})
RETURN i {
  .*,
  date: toString(i.date),
  receivedDate: toString(i.receivedDate),
  createdAt: toString(i.createdAt),
  updatedAt: toString(i.updatedAt)
} as income
`;

export const GET_INCOME_LIST = `
MATCH (i:Income {farmName: $farmName, username: $username})

// Apply filters
WHERE 
  ($startDate IS NULL OR i.date >= date($startDate)) AND
  ($endDate IS NULL OR i.date <= date($endDate)) AND
  ($source IS NULL OR i.source = $source) AND
  ($cropType IS NULL OR i.cropType = $cropType) AND
  ($marketChannel IS NULL OR i.marketChannel = $marketChannel) AND
  ($paymentStatus IS NULL OR i.paymentStatus = $paymentStatus) AND
  ($minAmount IS NULL OR i.amount >= $minAmount) AND
  ($maxAmount IS NULL OR i.amount <= $maxAmount) AND
  ($buyer IS NULL OR toLower(i.buyer) CONTAINS toLower($buyer)) AND
  ($taxable IS NULL OR i.taxable = $taxable)

// Calculate total count for pagination
WITH collect(i) as allIncome, count(i) as totalCount

// Apply sorting and pagination similar to expenses
WITH allIncome, totalCount,
  CASE $sortBy
    WHEN 'date' THEN [income IN allIncome | [income.date, income]]
    WHEN 'amount' THEN [income IN allIncome | [income.amount, income]]
    WHEN 'source' THEN [income IN allIncome | [income.source, income]]
    ELSE [income IN allIncome | [income.createdAt, income]]
  END as sortedPairs

WITH totalCount,
  CASE $sortOrder
    WHEN 'desc' THEN [pair IN sortedPairs | pair[1]] 
    ELSE reverse([pair IN sortedPairs | pair[1]])
  END as sortedIncome

WITH totalCount, sortedIncome[$skip..$skip + $limit] as paginatedIncome

UNWIND paginatedIncome as i
RETURN i {
  .*,
  date: toString(i.date),
  receivedDate: toString(i.receivedDate),
  createdAt: toString(i.createdAt),
  updatedAt: toString(i.updatedAt)
} as income, totalCount
`;

export const GET_INCOME_SUMMARY = `
MATCH (i:Income {farmName: $farmName, username: $username})
WHERE i.date >= date($startDate) AND i.date <= date($endDate)

RETURN {
  totalAmount: sum(i.amount),
  totalCount: count(i),
  averageAmount: avg(i.amount),
  sourceBreakdown: apoc.map.groupByMulti(
    collect({source: i.source, amount: i.amount}), 
    'source'
  ),
  cropBreakdown: apoc.map.groupByMulti(
    collect({cropType: i.cropType, amount: i.amount}), 
    'cropType'
  ),
  monthlyTrends: collect(DISTINCT {
    month: toString(i.date)[0..7],
    amount: sum(i.amount)
  }),
  pendingAmount: sum(CASE WHEN i.paymentStatus = 'pending' THEN i.amount ELSE 0 END),
  receivedAmount: sum(CASE WHEN i.paymentStatus = 'paid' THEN i.amount ELSE 0 END),
  taxableTotal: sum(CASE WHEN i.taxable THEN i.amount ELSE 0 END)
} as summary
`;

// ========================
// BUDGET MANAGEMENT QUERIES
// ========================

export const CREATE_BUDGET = `
CREATE (b:Budget {
  id: $id,
  farmName: $farmName,
  username: $username,
  name: $name,
  description: $description,
  period: $period,
  startDate: date($startDate),
  endDate: date($endDate),
  totalBudget: $totalBudget,
  currency: $currency,
  status: 'draft',
  categories: $categories,
  actualSpent: 0.0,
  remainingBudget: $totalBudget,
  utilizationPercentage: 0.0,
  createdAt: datetime(),
  updatedAt: datetime()
})

// Connect to farm
WITH b
MATCH (f:Farm {farmName: $farmName, username: $username})
CREATE (f)-[:HAS_BUDGET]->(b)

// Connect to user
WITH b
MATCH (u:User {username: $username})
CREATE (u)-[:MANAGES_BUDGET]->(b)

RETURN b
`;

export const UPDATE_BUDGET = `
MATCH (b:Budget {id: $budgetId, farmName: $farmName, username: $username})
SET 
  b.name = COALESCE($name, b.name),
  b.description = COALESCE($description, b.description),
  b.totalBudget = COALESCE($totalBudget, b.totalBudget),
  b.status = COALESCE($status, b.status),
  b.categories = COALESCE($categories, b.categories),
  b.updatedAt = datetime()

// Recalculate remaining budget and utilization
WITH b
SET 
  b.remainingBudget = b.totalBudget - b.actualSpent,
  b.utilizationPercentage = (b.actualSpent / b.totalBudget) * 100

RETURN b
`;

export const DELETE_BUDGET = `
MATCH (b:Budget {id: $budgetId, farmName: $farmName, username: $username})
DETACH DELETE b
RETURN count(b) as deletedCount
`;

export const GET_BUDGET_BY_ID = `
MATCH (b:Budget {id: $budgetId, farmName: $farmName, username: $username})

// Get actual spending for this budget period
OPTIONAL MATCH (e:Expense {farmName: $farmName, username: $username})
WHERE e.date >= b.startDate AND e.date <= b.endDate

WITH b, sum(e.amount) as actualSpent

// Update budget with current spending
SET 
  b.actualSpent = COALESCE(actualSpent, 0.0),
  b.remainingBudget = b.totalBudget - COALESCE(actualSpent, 0.0),
  b.utilizationPercentage = (COALESCE(actualSpent, 0.0) / b.totalBudget) * 100

RETURN b {
  .*,
  startDate: toString(b.startDate),
  endDate: toString(b.endDate),
  createdAt: toString(b.createdAt),
  updatedAt: toString(b.updatedAt)
} as budget
`;

export const GET_FARM_BUDGETS = `
MATCH (b:Budget {farmName: $farmName, username: $username})

// Get actual spending for each budget
OPTIONAL MATCH (e:Expense {farmName: $farmName, username: $username})
WHERE e.date >= b.startDate AND e.date <= b.endDate

WITH b, sum(e.amount) as actualSpent

// Update budget calculations
SET 
  b.actualSpent = COALESCE(actualSpent, 0.0),
  b.remainingBudget = b.totalBudget - COALESCE(actualSpent, 0.0),
  b.utilizationPercentage = (COALESCE(actualSpent, 0.0) / b.totalBudget) * 100

RETURN b {
  .*,
  startDate: toString(b.startDate),
  endDate: toString(b.endDate),
  createdAt: toString(b.createdAt),
  updatedAt: toString(b.updatedAt)
} as budget

ORDER BY b.createdAt DESC
`;

// ========================
// LOAN MANAGEMENT QUERIES
// ========================

export const CREATE_LOAN = `
CREATE (l:Loan {
  id: $id,
  farmName: $farmName,
  username: $username,
  loanType: $loanType,
  lender: $lender,
  principalAmount: $principalAmount,
  currency: $currency,
  interestRate: $interestRate,
  termMonths: $termMonths,
  monthlyPayment: $monthlyPayment,
  startDate: date($startDate),
  maturityDate: date($maturityDate),
  purpose: $purpose,
  collateral: $collateral,
  status: 'applied',
  remainingBalance: $principalAmount,
  nextPaymentDate: date($startDate),
  paymentsCount: 0,
  remainingPayments: $termMonths,
  createdAt: datetime(),
  updatedAt: datetime()
})

// Connect to farm
WITH l
MATCH (f:Farm {farmName: $farmName, username: $username})
CREATE (f)-[:HAS_LOAN]->(l)

// Connect to user
WITH l
MATCH (u:User {username: $username})
CREATE (u)-[:OWES_LOAN]->(l)

RETURN l
`;

export const UPDATE_LOAN = `
MATCH (l:Loan {id: $loanId, farmName: $farmName, username: $username})
SET 
  l.lender = COALESCE($lender, l.lender),
  l.interestRate = COALESCE($interestRate, l.interestRate),
  l.status = COALESCE($status, l.status),
  l.purpose = COALESCE($purpose, l.purpose),
  l.collateral = COALESCE($collateral, l.collateral),
  l.updatedAt = datetime()
RETURN l
`;

export const CREATE_LOAN_PAYMENT = `
MATCH (l:Loan {id: $loanId, farmName: $farmName, username: $username})

CREATE (p:LoanPayment {
  id: $paymentId,
  loanId: $loanId,
  paymentDate: date($paymentDate),
  amount: $amount,
  principalAmount: $principalAmount,
  interestAmount: $interestAmount,
  remainingBalance: l.remainingBalance - $principalAmount,
  paymentMethod: $paymentMethod,
  status: 'paid',
  lateFee: $lateFee,
  createdAt: datetime()
})

// Update loan with new payment info
SET 
  l.remainingBalance = l.remainingBalance - $principalAmount,
  l.paymentsCount = l.paymentsCount + 1,
  l.remainingPayments = l.remainingPayments - 1,
  l.nextPaymentDate = date($paymentDate) + duration({months: 1}),
  l.updatedAt = datetime()

// Create relationship
CREATE (l)-[:HAS_PAYMENT]->(p)

RETURN p, l
`;

export const GET_LOAN_BY_ID = `
MATCH (l:Loan {id: $loanId, farmName: $farmName, username: $username})
OPTIONAL MATCH (l)-[:HAS_PAYMENT]->(p:LoanPayment)

RETURN l {
  .*,
  startDate: toString(l.startDate),
  maturityDate: toString(l.maturityDate),
  nextPaymentDate: toString(l.nextPaymentDate),
  createdAt: toString(l.createdAt),
  updatedAt: toString(l.updatedAt),
  payments: collect(p {
    .*,
    paymentDate: toString(p.paymentDate),
    createdAt: toString(p.createdAt)
  })
} as loan
`;

export const GET_FARM_LOANS = `
MATCH (l:Loan {farmName: $farmName, username: $username})
OPTIONAL MATCH (l)-[:HAS_PAYMENT]->(p:LoanPayment)

RETURN l {
  .*,
  startDate: toString(l.startDate),
  maturityDate: toString(l.maturityDate),
  nextPaymentDate: toString(l.nextPaymentDate),
  createdAt: toString(l.createdAt),
  updatedAt: toString(l.updatedAt),
  paymentsCount: count(p),
  lastPaymentDate: max(p.paymentDate)
} as loan

ORDER BY l.createdAt DESC
`;

// ========================
// INSURANCE MANAGEMENT QUERIES
// ========================

export const CREATE_INSURANCE_POLICY = `
CREATE (ip:InsurancePolicy {
  id: $id,
  farmName: $farmName,
  username: $username,
  policyType: $policyType,
  provider: $provider,
  policyNumber: $policyNumber,
  coverageAmount: $coverageAmount,
  premium: $premium,
  deductible: $deductible,
  currency: $currency,
  startDate: date($startDate),
  endDate: date($endDate),
  status: 'active',
  coverageDetails: $coverageDetails,
  beneficiaries: $beneficiaries,
  paymentSchedule: $paymentSchedule,
  nextPaymentDate: date($startDate),
  createdAt: datetime(),
  updatedAt: datetime()
})

// Connect to farm
WITH ip
MATCH (f:Farm {farmName: $farmName, username: $username})
CREATE (f)-[:HAS_INSURANCE]->(ip)

// Connect to user
WITH ip
MATCH (u:User {username: $username})
CREATE (u)-[:HOLDS_POLICY]->(ip)

RETURN ip
`;

export const CREATE_INSURANCE_CLAIM = `
MATCH (ip:InsurancePolicy {id: $policyId, farmName: $farmName, username: $username})

CREATE (ic:InsuranceClaim {
  id: $claimId,
  policyId: $policyId,
  claimNumber: $claimNumber,
  incidentDate: date($incidentDate),
  reportedDate: date(),
  description: $description,
  estimatedLoss: $estimatedLoss,
  claimAmount: $claimAmount,
  status: 'reported',
  documentation: $documentation,
  createdAt: datetime(),
  updatedAt: datetime()
})

// Create relationship
CREATE (ip)-[:HAS_CLAIM]->(ic)

RETURN ic
`;

export const GET_INSURANCE_POLICIES = `
MATCH (ip:InsurancePolicy {farmName: $farmName, username: $username})
OPTIONAL MATCH (ip)-[:HAS_CLAIM]->(ic:InsuranceClaim)

RETURN ip {
  .*,
  startDate: toString(ip.startDate),
  endDate: toString(ip.endDate),
  nextPaymentDate: toString(ip.nextPaymentDate),
  createdAt: toString(ip.createdAt),
  updatedAt: toString(ip.updatedAt),
  claimsCount: count(ic),
  activeClaims: count(CASE WHEN ic.status IN ['reported', 'investigating'] THEN ic ELSE null END)
} as policy

ORDER BY ip.createdAt DESC
`;

// ========================
// FINANCIAL ANALYTICS QUERIES
// ========================

export const GET_FINANCIAL_SUMMARY = `
MATCH (f:Farm {farmName: $farmName, username: $username})

// Get income for period
OPTIONAL MATCH (f)-[:HAS_INCOME]->(i:Income)
WHERE i.date >= date($startDate) AND i.date <= date($endDate)

// Get expenses for period
OPTIONAL MATCH (f)-[:HAS_EXPENSE]->(e:Expense)
WHERE e.date >= date($startDate) AND e.date <= date($endDate)

// Get loans
OPTIONAL MATCH (f)-[:HAS_LOAN]->(l:Loan)
WHERE l.status = 'active'

WITH f, 
  sum(i.amount) as totalRevenue,
  sum(e.amount) as totalExpenses,
  sum(l.remainingBalance) as totalDebt,
  collect(DISTINCT {source: i.source, amount: i.amount}) as incomeBySource,
  collect(DISTINCT {category: e.category, amount: e.amount}) as expensesByCategory

RETURN {
  farmName: $farmName,
  period: {
    startDate: $startDate,
    endDate: $endDate
  },
  currency: $currency,
  revenue: {
    total: COALESCE(totalRevenue, 0),
    bySource: apoc.map.groupByMulti(incomeBySource, 'source'),
    growth: 0.0  // Calculate based on previous period
  },
  expenses: {
    total: COALESCE(totalExpenses, 0),
    byCategory: apoc.map.groupByMulti(expensesByCategory, 'category'),
    growth: 0.0  // Calculate based on previous period
  },
  profitability: {
    grossProfit: COALESCE(totalRevenue, 0) - COALESCE(totalExpenses, 0),
    netProfit: COALESCE(totalRevenue, 0) - COALESCE(totalExpenses, 0),
    profitMargin: CASE WHEN totalRevenue > 0 THEN ((totalRevenue - totalExpenses) / totalRevenue) * 100 ELSE 0 END,
    roi: 0.0  // Calculate based on investments
  },
  totalDebt: COALESCE(totalDebt, 0)
} as summary
`;

export const GET_CASH_FLOW_PROJECTION = `
MATCH (f:Farm {farmName: $farmName, username: $username})

// Get historical monthly patterns
OPTIONAL MATCH (f)-[:HAS_INCOME]->(i:Income)
WHERE i.date >= date() - duration({months: 12})

OPTIONAL MATCH (f)-[:HAS_EXPENSE]->(e:Expense)
WHERE e.date >= date() - duration({months: 12})

WITH f,
  collect({
    month: i.date.month,
    income: i.amount
  }) as monthlyIncome,
  collect({
    month: e.date.month,
    expense: e.amount
  }) as monthlyExpenses

// Project future months based on historical patterns
RETURN {
  farmName: $farmName,
  projectionPeriod: toString(date()) + ' to ' + toString(date() + duration({months: $projectionMonths})),
  monthlyProjections: [
    // Generate projections based on historical data and seasonal patterns
  ],
  seasonalFactors: {
    plantingSeason: {months: ['March', 'April', 'May'], cashOutflow: 0},
    growingSeason: {months: ['June', 'July', 'August'], maintenanceCosts: 0},
    harvestSeason: {months: ['September', 'October', 'November'], cashInflow: 0},
    dormantSeason: {months: ['December', 'January', 'February'], reducedActivity: 0}
  },
  riskFactors: ['Weather variability', 'Market price fluctuations', 'Equipment failure'],
  recommendations: ['Maintain cash reserves', 'Consider seasonal credit line', 'Diversify income sources']
} as projection
`;

// ========================
// UTILITY QUERIES
// ========================

export const GET_EXPENSE_CATEGORIES = `
RETURN [
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
] as categories
`;

export const GET_FARM_FINANCIAL_OVERVIEW = `
MATCH (f:Farm {farmName: $farmName, username: $username})

// Get current year totals
OPTIONAL MATCH (f)-[:HAS_INCOME]->(i:Income)
WHERE i.date.year = date().year

OPTIONAL MATCH (f)-[:HAS_EXPENSE]->(e:Expense)
WHERE e.date.year = date().year

OPTIONAL MATCH (f)-[:HAS_BUDGET]->(b:Budget)
WHERE b.status = 'active'

OPTIONAL MATCH (f)-[:HAS_LOAN]->(l:Loan)
WHERE l.status = 'active'

OPTIONAL MATCH (f)-[:HAS_INSURANCE]->(ip:InsurancePolicy)
WHERE ip.status = 'active'

RETURN {
  farmName: $farmName,
  currentYear: date().year,
  totalRevenue: sum(i.amount),
  totalExpenses: sum(e.amount),
  netIncome: sum(i.amount) - sum(e.amount),
  activeBudgets: count(DISTINCT b),
  activeLoans: count(DISTINCT l),
  totalDebt: sum(l.remainingBalance),
  insurancePolicies: count(DISTINCT ip),
  totalCoverage: sum(ip.coverageAmount),
  lastUpdated: datetime()
} as overview
`;
