import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Internal hourly rate (€125)
export const INTERNAL_HOURLY_RATE = 125

// Convert client budget to internal hours
export function budgetToInternalHours(budget: number): number {
  return budget / INTERNAL_HOURLY_RATE
}

// Convert internal hours to budget
export function internalHoursToBudget(hours: number): number {
  return hours * INTERNAL_HOURLY_RATE
}

// Format currency (Euro)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

// Format hours
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} uur`
}

// Get occupation status based on percentage
export type OccupationStatus = 'ok' | 'warning' | 'alert' | 'critical'

export function getOccupationStatus(percentage: number): OccupationStatus {
  if (percentage > 1) return 'critical'
  if (percentage > 0.8) return 'alert'
  if (percentage >= 0.7) return 'warning'
  return 'ok'
}

// Get status color class based on occupation status
export function getStatusColor(status: OccupationStatus): string {
  switch (status) {
    case 'ok':
      return 'text-green-600 bg-green-50'
    case 'warning':
      return 'text-amber-600 bg-amber-50'
    case 'alert':
      return 'text-red-600 bg-red-50'
    case 'critical':
      return 'text-red-800 bg-red-100'
  }
}

// Get progress bar color based on occupation percentage
export function getProgressBarColor(percentage: number): string {
  if (percentage > 1) return 'bg-red-800'
  if (percentage > 0.8) return 'bg-red-500'
  if (percentage >= 0.7) return 'bg-amber-500'
  return 'bg-green-500'
}

// Budget types that count towards net revenue
export const NET_REVENUE_BUDGET_TYPES = ['SUBSCRIPTION', 'PROJECT', 'PROSPECT', 'NACALCULATIE']

// Budget types excluded from net revenue
export const EXCLUDED_BUDGET_TYPES = ['TOOLING', 'INHUUR']

// Dutch month names
export const DUTCH_MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
]

// Get Dutch month name
export function getDutchMonth(month: number): string {
  return DUTCH_MONTHS[month - 1] || ''
}
