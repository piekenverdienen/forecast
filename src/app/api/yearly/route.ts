import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getWorkingDaysInMonth, getPublicHolidays } from "@/lib/capacity"

// GET /api/yearly - Get yearly overview data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const type = searchParams.get("type") || "clients" // clients or employees

    if (type === "clients") {
      return await getYearlyClientOverview(year)
    } else {
      return await getYearlyEmployeeOverview(year)
    }
  } catch (error) {
    console.error("Error fetching yearly data:", error)
    return NextResponse.json(
      { error: "Failed to fetch yearly data" },
      { status: 500 }
    )
  }
}

async function getYearlyClientOverview(year: number) {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    include: {
      budgets: {
        where: { year },
        orderBy: { month: "asc" },
      },
      invoices: {
        where: { year },
        orderBy: { month: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  const overview = clients.map((client) => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const monthBudgets = client.budgets.filter((b) => b.month === month)
      const monthInvoices = client.invoices.filter((inv) => inv.month === month)

      const budget = monthBudgets.reduce((sum, b) => sum + b.totalBudget, 0)
      const invoiced = monthInvoices.reduce((sum, inv) => sum + inv.amount, 0)

      let status = "PENDING"
      if (invoiced >= budget && budget > 0) {
        status = monthInvoices.some((inv) => inv.status === "PAID") ? "PAID" : "INVOICED"
      } else if (invoiced > 0) {
        status = "PARTIAL"
      }

      return {
        month,
        budget,
        invoiced,
        status,
        budgetTypes: monthBudgets.map((b) => b.budgetType),
      }
    })

    const totalBudget = months.reduce((sum, m) => sum + m.budget, 0)
    const totalInvoiced = months.reduce((sum, m) => sum + m.invoiced, 0)

    return {
      client: {
        id: client.id,
        name: client.name,
        classification: client.classification,
        paymentTerm: client.paymentTerm,
      },
      months,
      totalBudget,
      totalInvoiced,
    }
  })

  // Filter out clients with no budget for the year
  const filteredOverview = overview.filter((o) => o.totalBudget > 0)

  return NextResponse.json({
    year,
    type: "clients",
    data: filteredOverview,
    totals: {
      totalBudget: filteredOverview.reduce((sum, o) => sum + o.totalBudget, 0),
      totalInvoiced: filteredOverview.reduce((sum, o) => sum + o.totalInvoiced, 0),
      clientCount: filteredOverview.length,
    },
  })
}

async function getYearlyEmployeeOverview(year: number) {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      contracts: {
        where: {
          OR: [
            { endDate: null },
            { endDate: { gte: new Date(year, 0, 1) } },
          ],
          startDate: { lte: new Date(year, 11, 31) },
        },
      },
      leaves: {
        where: {
          startDate: { lte: new Date(year, 11, 31) },
          endDate: { gte: new Date(year, 0, 1) },
          status: "APPROVED",
        },
      },
      forecastEntries: {
        where: {
          clientBudget: {
            year,
          },
        },
        include: {
          clientBudget: {
            include: {
              client: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const holidays = await getPublicHolidays(year)

  const overview = employees.map((employee) => {
    const contract = employee.contracts[0] // Get active contract

    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const workingDays = getWorkingDaysInMonth(year, month, holidays)
      const hoursPerWeek = contract?.hoursPerWeek || 40
      const billableTarget = contract?.billableTarget || 0.8

      // Calculate max hours for month
      const maxHours = (hoursPerWeek / 5) * workingDays * billableTarget

      // Calculate leave hours for this month
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      const leaveHours = employee.leaves
        .filter((leave) => {
          const leaveStart = new Date(leave.startDate)
          const leaveEnd = new Date(leave.endDate)
          return leaveStart <= monthEnd && leaveEnd >= monthStart
        })
        .reduce((sum, leave) => sum + leave.hours, 0)

      // Calculate planned hours for this month
      const plannedHours = employee.forecastEntries
        .filter((entry) => entry.clientBudget.month === month)
        .reduce((sum, entry) => {
          const clientRate = entry.clientBudget.client.hourlyRate
          return sum + entry.budgetAmount / clientRate
        }, 0)

      const availableHours = Math.max(0, maxHours - leaveHours)
      const occupationRate = availableHours > 0 ? plannedHours / availableHours : 0

      let status = "ok"
      if (occupationRate > 0.9) status = "critical"
      else if (occupationRate > 0.8) status = "alert"
      else if (occupationRate > 0.7) status = "warning"

      return {
        month,
        maxHours,
        plannedHours,
        leaveHours,
        availableHours,
        occupationRate,
        status,
      }
    })

    const totalMaxHours = months.reduce((sum, m) => sum + m.maxHours, 0)
    const totalPlannedHours = months.reduce((sum, m) => sum + m.plannedHours, 0)
    const totalLeaveHours = months.reduce((sum, m) => sum + m.leaveHours, 0)
    const averageOccupation = totalMaxHours > 0 ? totalPlannedHours / totalMaxHours : 0

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
      },
      contract: contract
        ? {
            hoursPerWeek: contract.hoursPerWeek,
            billableTarget: contract.billableTarget,
          }
        : null,
      months,
      totalMaxHours,
      totalPlannedHours,
      totalLeaveHours,
      averageOccupation,
    }
  })

  return NextResponse.json({
    year,
    type: "employees",
    data: overview,
    totals: {
      totalMaxHours: overview.reduce((sum, o) => sum + o.totalMaxHours, 0),
      totalPlannedHours: overview.reduce((sum, o) => sum + o.totalPlannedHours, 0),
      totalLeaveHours: overview.reduce((sum, o) => sum + o.totalLeaveHours, 0),
      employeeCount: overview.length,
    },
  })
}
