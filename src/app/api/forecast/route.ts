import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/forecast - Get forecast data for a specific month
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())

    // Get all client budgets for the month with their forecast entries
    const budgets = await prisma.clientBudget.findMany({
      where: {
        year,
        month,
        client: {
          isActive: true,
        },
      },
      include: {
        client: true,
        forecastEntries: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: {
        client: {
          name: "asc",
        },
      },
    })

    // Group by client
    const clientMap = new Map<string, any>()

    for (const budget of budgets) {
      const clientId = budget.clientId
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client: budget.client,
          budgets: [],
          totalBudget: 0,
          totalAllocated: 0,
        })
      }

      const clientData = clientMap.get(clientId)
      const allocatedAmount = budget.forecastEntries.reduce(
        (sum, entry) => sum + entry.budgetAmount,
        0
      )

      clientData.budgets.push({
        ...budget,
        allocatedAmount,
        unallocatedAmount: budget.totalBudget - allocatedAmount,
      })
      clientData.totalBudget += budget.totalBudget
      clientData.totalAllocated += allocatedAmount
    }

    const result = Array.from(clientMap.values())

    return NextResponse.json({
      year,
      month,
      clients: result,
      summary: {
        totalBudget: result.reduce((sum, c) => sum + c.totalBudget, 0),
        totalAllocated: result.reduce((sum, c) => sum + c.totalAllocated, 0),
        clientCount: result.length,
      },
    })
  } catch (error) {
    console.error("Error fetching forecast:", error)
    return NextResponse.json(
      { error: "Failed to fetch forecast" },
      { status: 500 }
    )
  }
}
