import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  calculateWorkingDays,
  calculateEmployeeCapacity,
  getCapacityStatus,
} from "@/lib/capacity"
import { INTERNAL_HOURLY_RATE, NET_REVENUE_BUDGET_TYPES } from "@/lib/utils"

// GET /api/dashboard - Get dashboard KPIs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString()
    )
    const month = parseInt(
      searchParams.get("month") || (new Date().getMonth() + 1).toString()
    )

    // Get sales target
    const salesTarget = await prisma.salesTarget.findUnique({
      where: {
        year_month: { year, month },
      },
    })

    // Get all budgets for the month
    const budgets = await prisma.clientBudget.findMany({
      where: {
        year,
        month,
        client: {
          isActive: true,
        },
      },
      include: {
        forecastEntries: true,
      },
    })

    // Calculate sales KPIs
    let grossRevenue = 0
    let netRevenue = 0
    let weightedProspects = 0

    for (const budget of budgets) {
      grossRevenue += budget.totalBudget

      if (NET_REVENUE_BUDGET_TYPES.includes(budget.budgetType)) {
        if (budget.budgetType === "PROSPECT") {
          weightedProspects +=
            budget.totalBudget * (budget.prospectProbability || 0.5)
        } else {
          netRevenue += budget.totalBudget
        }
      }
    }

    const totalNetForecast = netRevenue + weightedProspects
    const targetAmount = salesTarget?.targetAmount || 0
    const difference = totalNetForecast - targetAmount
    const differencePercentage =
      targetAmount > 0 ? difference / targetAmount : 0
    const avgClientValue = salesTarget?.avgClientValue || 5000
    const clientsNeeded =
      difference < 0 ? Math.ceil(Math.abs(difference) / avgClientValue) : 0

    // Get capacity data
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)

    const holidays = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    const holidayDates = holidays.map((h) => new Date(h.date))
    const workingDays = calculateWorkingDays(year, month, holidayDates)

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        contracts: {
          where: {
            startDate: { lte: endOfMonth },
            OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
          },
          orderBy: { startDate: "desc" },
          take: 1,
        },
        leaves: {
          where: {
            status: "APPROVED",
            OR: [
              { startDate: { gte: startOfMonth, lte: endOfMonth } },
              { endDate: { gte: startOfMonth, lte: endOfMonth } },
              {
                AND: [
                  { startDate: { lte: startOfMonth } },
                  { endDate: { gte: endOfMonth } },
                ],
              },
            ],
          },
        },
        forecastEntries: {
          where: {
            clientBudget: { year, month },
          },
        },
      },
    })

    let totalMaxHours = 0
    let totalPlannedHours = 0
    let alertCount = 0
    let criticalCount = 0

    for (const employee of employees) {
      const contract = employee.contracts[0]
      const hoursPerWeek = contract?.hoursPerWeek || 40
      const billableTarget = contract?.billableTarget || 0.8

      const leaveHours = employee.leaves.reduce(
        (sum, leave) => sum + leave.hours,
        0
      )

      const capacity = calculateEmployeeCapacity(
        hoursPerWeek,
        billableTarget,
        workingDays,
        leaveHours
      )

      const plannedBudget = employee.forecastEntries.reduce(
        (sum, entry) => sum + entry.budgetAmount,
        0
      )
      const plannedHours = plannedBudget / INTERNAL_HOURLY_RATE

      totalMaxHours += capacity.maxHours
      totalPlannedHours += plannedHours

      const status = getCapacityStatus(plannedHours, capacity)

      if (status.status === "critical") {
        criticalCount++
        alertCount++
      } else if (status.status === "alert") {
        alertCount++
      }
    }

    const averageOccupation =
      totalMaxHours > 0 ? totalPlannedHours / totalMaxHours : 0

    return NextResponse.json({
      year,
      month,
      sales: {
        target: targetAmount,
        grossForecast: grossRevenue,
        netForecast: netRevenue,
        weightedProspects,
        totalNetForecast,
        difference,
        differencePercentage,
        clientsNeeded,
        avgClientValue,
      },
      capacity: {
        totalMaxHours,
        totalPlannedHours,
        averageOccupation,
        alertCount,
        criticalCount,
        employeeCount: employees.length,
        workingDays,
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    )
  }
}
