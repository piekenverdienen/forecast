import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  calculateWorkingDays,
  calculateEmployeeCapacity,
  calculateOccupationRate,
} from "@/lib/capacity"
import { INTERNAL_HOURLY_RATE } from "@/lib/utils"

interface Alert {
  id: string
  type: "capacity" | "budget" | "deadline"
  severity: "warning" | "alert" | "critical"
  title: string
  description: string
  employeeId?: string
  clientId?: string
  link?: string
}

// GET /api/dashboard/alerts - Get all alerts
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

    const alerts: Alert[] = []

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

    // Check employee capacity alerts
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
      const occupationRate = calculateOccupationRate(
        plannedHours,
        capacity.maxHours
      )

      if (occupationRate > 1) {
        alerts.push({
          id: `capacity-critical-${employee.id}`,
          type: "capacity",
          severity: "critical",
          title: `${employee.name} is overbelast`,
          description: `Bezettingsgraad: ${(occupationRate * 100).toFixed(0)}% (${plannedHours.toFixed(1)} van ${capacity.maxHours.toFixed(1)} uur)`,
          employeeId: employee.id,
          link: `/capacity?employee=${employee.id}`,
        })
      } else if (occupationRate > 0.8) {
        alerts.push({
          id: `capacity-alert-${employee.id}`,
          type: "capacity",
          severity: "alert",
          title: `${employee.name} nadert maximale bezetting`,
          description: `Bezettingsgraad: ${(occupationRate * 100).toFixed(0)}% (${plannedHours.toFixed(1)} van ${capacity.maxHours.toFixed(1)} uur)`,
          employeeId: employee.id,
          link: `/capacity?employee=${employee.id}`,
        })
      }
    }

    // Check for unallocated budget alerts
    const budgets = await prisma.clientBudget.findMany({
      where: {
        year,
        month,
        client: { isActive: true },
      },
      include: {
        client: true,
        forecastEntries: true,
      },
    })

    for (const budget of budgets) {
      const allocatedAmount = budget.forecastEntries.reduce(
        (sum, entry) => sum + entry.budgetAmount,
        0
      )
      const unallocatedAmount = budget.totalBudget - allocatedAmount

      if (unallocatedAmount > budget.totalBudget * 0.2 && unallocatedAmount > 500) {
        alerts.push({
          id: `budget-unallocated-${budget.id}`,
          type: "budget",
          severity: "warning",
          title: `Onverdeeld budget voor ${budget.client.name}`,
          description: `€${unallocatedAmount.toFixed(0)} van €${budget.totalBudget.toFixed(0)} nog niet toegewezen`,
          clientId: budget.clientId,
          link: `/forecast?client=${budget.clientId}`,
        })
      }
    }

    // Sort alerts by severity
    const severityOrder = { critical: 0, alert: 1, warning: 2 }
    alerts.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    )

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        alert: alerts.filter((a) => a.severity === "alert").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
      },
    })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    )
  }
}
