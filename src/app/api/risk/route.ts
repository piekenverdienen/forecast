import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { INTERNAL_HOURLY_RATE, NET_REVENUE_BUDGET_TYPES } from "@/lib/utils"

// GET /api/risk - Get risk analysis data
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

    // Get all budgets for the month
    const budgets = await prisma.clientBudget.findMany({
      where: {
        year,
        month,
        client: { isActive: true },
      },
      include: {
        client: true,
        forecastEntries: {
          include: {
            employee: true,
          },
        },
      },
    })

    // Calculate total revenue
    let totalRevenue = 0
    for (const budget of budgets) {
      if (NET_REVENUE_BUDGET_TYPES.includes(budget.budgetType)) {
        if (budget.budgetType === "PROSPECT") {
          totalRevenue += budget.totalBudget * (budget.prospectProbability || 0.5)
        } else {
          totalRevenue += budget.totalBudget
        }
      }
    }

    // Group by client and calculate risk metrics
    const clientMap = new Map<string, any>()

    for (const budget of budgets) {
      const clientId = budget.clientId
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client: budget.client,
          totalBudget: 0,
          impactedEmployees: new Map<string, { employee: any; hours: number }>(),
        })
      }

      const clientData = clientMap.get(clientId)

      // Add budget
      if (NET_REVENUE_BUDGET_TYPES.includes(budget.budgetType)) {
        if (budget.budgetType === "PROSPECT") {
          clientData.totalBudget +=
            budget.totalBudget * (budget.prospectProbability || 0.5)
        } else {
          clientData.totalBudget += budget.totalBudget
        }
      }

      // Track impacted employees
      for (const entry of budget.forecastEntries) {
        const employeeId = entry.employeeId
        if (!clientData.impactedEmployees.has(employeeId)) {
          clientData.impactedEmployees.set(employeeId, {
            employee: entry.employee,
            hours: 0,
          })
        }
        const empData = clientData.impactedEmployees.get(employeeId)
        empData.hours += entry.budgetAmount / INTERNAL_HOURLY_RATE
      }
    }

    // Convert to array and calculate risk levels
    const clients = Array.from(clientMap.values()).map((clientData) => {
      const revenueShare =
        totalRevenue > 0 ? clientData.totalBudget / totalRevenue : 0

      let riskLevel: "low" | "medium" | "high"
      if (revenueShare > 0.1) {
        riskLevel = "high"
      } else if (revenueShare > 0.05) {
        riskLevel = "medium"
      } else {
        riskLevel = "low"
      }

      return {
        client: {
          id: clientData.client.id,
          name: clientData.client.name,
          classification: clientData.client.classification,
          clientType: clientData.client.clientType,
        },
        monthlyBudget: clientData.totalBudget,
        revenueShare,
        riskLevel,
        impactedEmployees: Array.from(clientData.impactedEmployees.values()).map(
          (emp: any) => ({
            employeeId: emp.employee.id,
            employeeName: emp.employee.name,
            hours: emp.hours,
          })
        ),
      }
    })

    // Sort by revenue share (highest first)
    clients.sort((a, b) => b.revenueShare - a.revenueShare)

    // Calculate distribution metrics
    const b2bClients = clients.filter(
      (c) => c.client.clientType === "B2B"
    )
    const b2cClients = clients.filter(
      (c) => c.client.clientType === "B2C"
    )

    const classificationDistribution = {
      A: clients.filter((c) => c.client.classification === "A").length,
      B: clients.filter((c) => c.client.classification === "B").length,
      C: clients.filter((c) => c.client.classification === "C").length,
      D: clients.filter((c) => c.client.classification === "D").length,
    }

    return NextResponse.json({
      year,
      month,
      clients,
      summary: {
        totalRevenue,
        clientCount: clients.length,
        highRiskCount: clients.filter((c) => c.riskLevel === "high").length,
        mediumRiskCount: clients.filter((c) => c.riskLevel === "medium")
          .length,
        lowRiskCount: clients.filter((c) => c.riskLevel === "low").length,
        b2bCount: b2bClients.length,
        b2bRevenue: b2bClients.reduce((sum, c) => sum + c.monthlyBudget, 0),
        b2cCount: b2cClients.length,
        b2cRevenue: b2cClients.reduce((sum, c) => sum + c.monthlyBudget, 0),
        classificationDistribution,
      },
    })
  } catch (error) {
    console.error("Error fetching risk data:", error)
    return NextResponse.json(
      { error: "Failed to fetch risk data" },
      { status: 500 }
    )
  }
}
