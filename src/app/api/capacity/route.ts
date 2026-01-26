import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  calculateWorkingDays,
  calculateEmployeeCapacity,
  getCapacityStatus,
} from "@/lib/capacity"
import { INTERNAL_HOURLY_RATE } from "@/lib/utils"

// GET /api/capacity - Get capacity overview for all employees
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

    // Get public holidays for the month
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

    // Get all active employees with their contracts and leaves
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
              {
                startDate: { gte: startOfMonth, lte: endOfMonth },
              },
              {
                endDate: { gte: startOfMonth, lte: endOfMonth },
              },
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
            clientBudget: {
              year,
              month,
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

    const capacityData = employees.map((employee) => {
      const contract = employee.contracts[0]
      const hoursPerWeek = contract?.hoursPerWeek || 40
      const billableTarget = contract?.billableTarget || 0.8

      // Calculate leave hours for this month
      const leaveHours = employee.leaves.reduce(
        (sum, leave) => sum + leave.hours,
        0
      )

      // Calculate capacity
      const capacity = calculateEmployeeCapacity(
        hoursPerWeek,
        billableTarget,
        workingDays,
        leaveHours
      )

      // Calculate planned hours from forecast entries
      const plannedBudget = employee.forecastEntries.reduce(
        (sum, entry) => sum + entry.budgetAmount,
        0
      )
      const plannedHours = plannedBudget / INTERNAL_HOURLY_RATE

      // Get capacity status
      const status = getCapacityStatus(plannedHours, capacity)

      // Group forecast entries by client
      const clientBreakdown = new Map<
        string,
        { clientId: string; clientName: string; hours: number; tasks: string[] }
      >()

      for (const entry of employee.forecastEntries) {
        const clientId = entry.clientBudget.clientId
        const clientName = entry.clientBudget.client.name

        if (!clientBreakdown.has(clientId)) {
          clientBreakdown.set(clientId, {
            clientId,
            clientName,
            hours: 0,
            tasks: [],
          })
        }

        const clientData = clientBreakdown.get(clientId)!
        clientData.hours += entry.budgetAmount / INTERNAL_HOURLY_RATE
        clientData.tasks.push(entry.taskDescription)
      }

      return {
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
        },
        contract: contract
          ? {
              hoursPerWeek,
              billableTarget,
            }
          : null,
        capacity,
        status,
        clients: Array.from(clientBreakdown.values()),
      }
    })

    // Calculate summary
    const summary = {
      totalEmployees: capacityData.length,
      totalMaxHours: capacityData.reduce(
        (sum, e) => sum + e.capacity.maxHours,
        0
      ),
      totalPlannedHours: capacityData.reduce(
        (sum, e) => sum + e.status.plannedHours,
        0
      ),
      averageOccupation:
        capacityData.length > 0
          ? capacityData.reduce((sum, e) => sum + e.status.occupationRate, 0) /
            capacityData.length
          : 0,
      alertCount: capacityData.filter(
        (e) => e.status.status === "alert" || e.status.status === "critical"
      ).length,
      criticalCount: capacityData.filter((e) => e.status.status === "critical")
        .length,
      workingDays,
    }

    return NextResponse.json({
      year,
      month,
      employees: capacityData,
      summary,
    })
  } catch (error) {
    console.error("Error fetching capacity:", error)
    return NextResponse.json(
      { error: "Failed to fetch capacity" },
      { status: 500 }
    )
  }
}
