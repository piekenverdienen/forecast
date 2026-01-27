// User roles
export type UserRole = 'ADMIN' | 'PLANNER' | 'CONSULTANT'

// Leave types
export type LeaveType = 'VACATION' | 'SICK' | 'OTHER'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

// Client types
export type ClientType = 'B2B' | 'B2C'
export type ClientClassification = 'A' | 'B' | 'C' | 'D'

// Budget types
export type BudgetType =
  | 'SUBSCRIPTION'
  | 'PROJECT'
  | 'PROSPECT'
  | 'TOOLING'
  | 'NACALCULATIE'
  | 'INHUUR'

// Occupation status
export type OccupationStatus = 'ok' | 'warning' | 'alert' | 'critical'

// Employee with relations
export interface EmployeeWithDetails {
  id: string
  name: string
  email: string
  timechimpId: string | null
  hourlyRate: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  contracts: EmployeeContract[]
  leaves: Leave[]
  forecastEntries: ForecastEntryWithBudget[]
}

export interface EmployeeContract {
  id: string
  employeeId: string
  hoursPerWeek: number
  billableTarget: number
  startDate: Date
  endDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Leave {
  id: string
  employeeId: string
  startDate: Date
  endDate: Date
  hours: number
  type: LeaveType
  status: LeaveStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

// Client with relations
export interface ClientWithDetails {
  id: string
  name: string
  timechimpId: string | null
  clientType: ClientType
  classification: ClientClassification
  hourlyRate: number
  contractStart: Date | null
  contractEnd: Date | null
  isActive: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
  budgets: ClientBudgetWithEntries[]
}

export interface ClientBudget {
  id: string
  clientId: string
  year: number
  month: number
  totalBudget: number
  budgetType: BudgetType
  prospectProbability: number | null
  createdAt: Date
  updatedAt: Date
}

export interface ClientBudgetWithEntries extends ClientBudget {
  forecastEntries: ForecastEntry[]
  client: {
    id: string
    name: string
    hourlyRate: number
  }
}

export interface ForecastEntry {
  id: string
  clientBudgetId: string
  employeeId: string
  taskDescription: string
  budgetAmount: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ForecastEntryWithBudget extends ForecastEntry {
  clientBudget: ClientBudgetWithClient
}

export interface ClientBudgetWithClient extends ClientBudget {
  client: {
    id: string
    name: string
    hourlyRate: number
  }
}

// Dashboard KPIs
export interface DashboardKPIs {
  sales: {
    target: number
    forecast: number
    netForecast: number
    weightedProspects: number
    difference: number
    differencePercentage: number
    clientsNeeded: number
  }
  capacity: {
    totalMaxHours: number
    totalPlannedHours: number
    averageOccupation: number
    alertCount: number
    criticalCount: number
  }
}

// Capacity view
export interface EmployeeCapacity {
  employee: {
    id: string
    name: string
    email: string
  }
  maxHours: number
  plannedHours: number
  occupationRate: number
  status: OccupationStatus
  leaveHours: number
  clients: {
    clientId: string
    clientName: string
    hours: number
    tasks: string[]
  }[]
}

// Risk view
export interface ClientRisk {
  client: {
    id: string
    name: string
    classification: ClientClassification
    clientType: ClientType
  }
  monthlyBudget: number
  revenueShare: number
  riskLevel: 'low' | 'medium' | 'high'
  impactedEmployees: {
    employeeId: string
    employeeName: string
    hours: number
  }[]
}

// Sales target
export interface SalesTarget {
  id: string
  year: number
  month: number
  targetAmount: number
  avgClientValue: number
  createdAt: Date
  updatedAt: Date
}

// Public holiday
export interface PublicHoliday {
  id: string
  date: Date
  name: string
  year: number
}

// Payment terms
export type PaymentTerm = 'PREPAID' | 'POSTPAID'

// Invoice status
export type InvoiceStatus = 'PENDING' | 'INVOICED' | 'PAID' | 'OVERDUE'

// Invoice
export interface Invoice {
  id: string
  clientId: string
  clientBudgetId: string | null
  year: number
  month: number
  invoiceNumber: string | null
  amount: number
  invoiceDate: Date | null
  dueDate: Date | null
  status: InvoiceStatus
  paymentTerm: PaymentTerm
  notes: string | null
  createdAt: Date
  updatedAt: Date
  client?: {
    id: string
    name: string
    paymentTerm: PaymentTerm
  }
}

// Role with billable target
export interface Role {
  id: string
  name: string
  description: string | null
  billableTarget: number
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// Settings
export interface Setting {
  id: string
  key: string
  value: string
  description: string | null
  category: 'GENERAL' | 'CAPACITY' | 'INVOICING' | 'NOTIFICATIONS'
  createdAt: Date
  updatedAt: Date
}

// Capacity Suggestion types
export type SuggestionType = 'REASSIGNMENT' | 'OVERLOAD' | 'UNDERLOAD' | 'VACATION_COVER'
export type SuggestionPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type SuggestionStatus = 'PENDING' | 'APPLIED' | 'DISMISSED'

export interface CapacitySuggestion {
  id: string
  year: number
  month: number
  employeeId: string
  suggestionType: SuggestionType
  title: string
  description: string
  suggestedAction: string // JSON
  priority: SuggestionPriority
  status: SuggestionStatus
  createdAt: Date
  updatedAt: Date
}

// Yearly overview types
export interface YearlyClientOverview {
  client: {
    id: string
    name: string
    classification: ClientClassification
    paymentTerm: PaymentTerm
  }
  months: {
    month: number
    budget: number
    invoiced: number
    status: InvoiceStatus
  }[]
  totalBudget: number
  totalInvoiced: number
}

export interface YearlyEmployeeOverview {
  employee: {
    id: string
    name: string
    email: string
  }
  months: {
    month: number
    maxHours: number
    plannedHours: number
    leaveHours: number
    occupationRate: number
    status: OccupationStatus
  }[]
  averageOccupation: number
  totalLeaveHours: number
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
}
