import {
  eachDayOfInterval,
  isWeekend,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  parseISO,
  isWithinInterval
} from 'date-fns'
import { INTERNAL_HOURLY_RATE } from './utils'

// Calculate working days in a month (excluding weekends and public holidays)
export function calculateWorkingDays(
  year: number,
  month: number,
  publicHolidays: Date[]
): number {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))

  const days = eachDayOfInterval({ start, end })

  return days.filter(day => {
    // Exclude weekends
    if (isWeekend(day)) return false

    // Exclude public holidays
    const isHoliday = publicHolidays.some(holiday =>
      holiday.getFullYear() === day.getFullYear() &&
      holiday.getMonth() === day.getMonth() &&
      holiday.getDate() === day.getDate()
    )
    if (isHoliday) return false

    return true
  }).length
}

// Calculate leave hours for an employee in a specific month
export function calculateLeaveHours(
  leaves: { startDate: Date; endDate: Date; hours: number; status: string }[],
  year: number,
  month: number
): number {
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(new Date(year, month - 1))

  return leaves
    .filter(leave => leave.status === 'APPROVED')
    .filter(leave => {
      // Check if leave overlaps with the month
      const leaveStart = new Date(leave.startDate)
      const leaveEnd = new Date(leave.endDate)

      return (
        isWithinInterval(leaveStart, { start: monthStart, end: monthEnd }) ||
        isWithinInterval(leaveEnd, { start: monthStart, end: monthEnd }) ||
        (leaveStart <= monthStart && leaveEnd >= monthEnd)
      )
    })
    .reduce((total, leave) => {
      // For simplicity, we use the stored hours value
      // In a more sophisticated implementation, we would calculate
      // the portion of hours that falls within this month
      return total + leave.hours
    }, 0)
}

// Calculate maximum capacity for an employee in a month
export interface CapacityCalculation {
  workingDays: number
  maxHours: number
  maxBudget: number
  targetBudget: number
  leaveHours: number
  availableHours: number
}

export function calculateEmployeeCapacity(
  hoursPerWeek: number,
  billableTarget: number,
  workingDays: number,
  leaveHours: number
): CapacityCalculation {
  // Daily hours = weekly hours / 5 (assuming 5-day work week)
  const dailyHours = hoursPerWeek / 5

  // Max hours = daily hours × working days - leave hours
  const maxHours = (dailyHours * workingDays) - leaveHours
  const availableHours = Math.max(0, maxHours)

  // Max budget = max hours × internal rate
  const maxBudget = availableHours * INTERNAL_HOURLY_RATE

  // Target budget = max budget × billable target (80%)
  const targetBudget = maxBudget * billableTarget

  return {
    workingDays,
    maxHours: availableHours,
    maxBudget,
    targetBudget,
    leaveHours,
    availableHours
  }
}

// Calculate occupation rate
export function calculateOccupationRate(
  plannedHours: number,
  maxHours: number
): number {
  if (maxHours <= 0) return 0
  return plannedHours / maxHours
}

// Calculate planned hours from forecast entries
export function calculatePlannedHours(
  forecastEntries: { budgetAmount: number }[]
): number {
  const totalBudget = forecastEntries.reduce(
    (sum, entry) => sum + entry.budgetAmount,
    0
  )
  return totalBudget / INTERNAL_HOURLY_RATE
}

// Get capacity status details
export interface CapacityStatus {
  occupationRate: number
  plannedHours: number
  maxHours: number
  targetHours: number
  status: 'ok' | 'warning' | 'alert' | 'critical'
  overHours: number
}

export function getCapacityStatus(
  plannedHours: number,
  capacity: CapacityCalculation
): CapacityStatus {
  const occupationRate = calculateOccupationRate(plannedHours, capacity.maxHours)
  const targetHours = capacity.maxHours * 0.8
  const overHours = Math.max(0, plannedHours - capacity.maxHours)

  let status: 'ok' | 'warning' | 'alert' | 'critical'
  if (occupationRate > 1) {
    status = 'critical'
  } else if (occupationRate > 0.8) {
    status = 'alert'
  } else if (occupationRate >= 0.7) {
    status = 'warning'
  } else {
    status = 'ok'
  }

  return {
    occupationRate,
    plannedHours,
    maxHours: capacity.maxHours,
    targetHours,
    status,
    overHours
  }
}
