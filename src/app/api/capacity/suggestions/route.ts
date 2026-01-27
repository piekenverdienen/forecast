import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getWorkingDaysInMonth, getPublicHolidays } from "@/lib/capacity"

interface Suggestion {
  id: string
  type: "OVERLOAD" | "UNDERLOAD" | "VACATION_COVER" | "REASSIGNMENT"
  priority: "LOW" | "MEDIUM" | "HIGH"
  employeeId: string
  employeeName: string
  title: string
  description: string
  suggestedAction: {
    type: string
    fromEmployeeId?: string
    toEmployeeId?: string
    hours?: number
    clientId?: string
    clientName?: string
  }
}

// GET /api/capacity/suggestions - Generate smart capacity suggestions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())

    const suggestions: Suggestion[] = []

    // Get all employees with their capacity data
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        contracts: {
          where: {
            OR: [{ endDate: null }, { endDate: { gte: new Date(year, month - 1, 1) } }],
            startDate: { lte: new Date(year, month, 0) },
          },
        },
        leaves: {
          where: {
            startDate: { lte: new Date(year, month, 0) },
            endDate: { gte: new Date(year, month - 1, 1) },
            status: "APPROVED",
          },
        },
        forecastEntries: {
          where: {
            clientBudget: { year, month },
          },
          include: {
            clientBudget: {
              include: { client: true },
            },
          },
        },
      },
    })

    const holidays = await getPublicHolidays(year)
    const workingDays = getWorkingDaysInMonth(year, month, holidays)

    // Calculate capacity for each employee
    const employeeCapacity = employees.map((employee) => {
      const contract = employee.contracts[0]
      const hoursPerWeek = contract?.hoursPerWeek || 40
      const billableTarget = contract?.billableTarget || 0.8
      const maxHours = (hoursPerWeek / 5) * workingDays * billableTarget

      // Calculate leave hours for this month
      const leaveHours = employee.leaves.reduce((sum, leave) => sum + leave.hours, 0)
      const availableHours = Math.max(0, maxHours - leaveHours)

      // Calculate planned hours
      const plannedHours = employee.forecastEntries.reduce((sum, entry) => {
        const clientRate = entry.clientBudget.client.hourlyRate
        return sum + entry.budgetAmount / clientRate
      }, 0)

      const occupationRate = availableHours > 0 ? plannedHours / availableHours : 0
      const overHours = plannedHours - availableHours

      return {
        employee,
        contract,
        maxHours,
        leaveHours,
        availableHours,
        plannedHours,
        occupationRate,
        overHours,
        hasVacation: leaveHours > 0,
        clients: employee.forecastEntries.map((entry) => ({
          clientId: entry.clientBudget.client.id,
          clientName: entry.clientBudget.client.name,
          hours: entry.budgetAmount / entry.clientBudget.client.hourlyRate,
          budgetId: entry.clientBudgetId,
        })),
      }
    })

    // Find overloaded employees
    const overloaded = employeeCapacity.filter((e) => e.occupationRate > 0.9)
    const underloaded = employeeCapacity.filter((e) => e.occupationRate < 0.6 && e.availableHours > 0)
    const withVacation = employeeCapacity.filter((e) => e.hasVacation && e.occupationRate > 0.5)

    // Generate suggestions for overloaded employees
    for (const overloadedEmp of overloaded) {
      const priority = overloadedEmp.occupationRate > 1 ? "HIGH" : "MEDIUM"

      // Find potential employees to take over work
      for (const underloadedEmp of underloaded) {
        // Find common clients or similar skills
        const overloadedClients = overloadedEmp.clients
        const freeHours = underloadedEmp.availableHours - underloadedEmp.plannedHours

        for (const client of overloadedClients) {
          if (freeHours >= client.hours * 0.5) {
            // Can take at least 50% of the work
            const transferHours = Math.min(
              client.hours,
              freeHours,
              overloadedEmp.overHours
            )

            suggestions.push({
              id: `${overloadedEmp.employee.id}-${underloadedEmp.employee.id}-${client.clientId}`,
              type: "REASSIGNMENT",
              priority,
              employeeId: overloadedEmp.employee.id,
              employeeName: overloadedEmp.employee.name,
              title: `Herverdeling werk naar ${underloadedEmp.employee.name}`,
              description: `${overloadedEmp.employee.name} staat op ${Math.round(overloadedEmp.occupationRate * 100)}% bezetting. ${underloadedEmp.employee.name} heeft nog ${freeHours.toFixed(0)} uur beschikbaar en kan werk voor ${client.clientName} overnemen.`,
              suggestedAction: {
                type: "TRANSFER",
                fromEmployeeId: overloadedEmp.employee.id,
                toEmployeeId: underloadedEmp.employee.id,
                hours: transferHours,
                clientId: client.clientId,
                clientName: client.clientName,
              },
            })
          }
        }
      }

      // If no redistribution possible, flag as overload warning
      if (!underloaded.some((u) => u.availableHours - u.plannedHours > 10)) {
        suggestions.push({
          id: `overload-${overloadedEmp.employee.id}`,
          type: "OVERLOAD",
          priority: "HIGH",
          employeeId: overloadedEmp.employee.id,
          employeeName: overloadedEmp.employee.name,
          title: `Overbezetting ${overloadedEmp.employee.name}`,
          description: `${overloadedEmp.employee.name} staat gepland op ${Math.round(overloadedEmp.occupationRate * 100)}% (${overloadedEmp.plannedHours.toFixed(0)} van ${overloadedEmp.availableHours.toFixed(0)} uur). Er is ${overloadedEmp.overHours.toFixed(0)} uur te veel ingepland en er zijn geen collega's beschikbaar voor herverdeling.`,
          suggestedAction: {
            type: "REDUCE_WORK",
            hours: overloadedEmp.overHours,
          },
        })
      }
    }

    // Generate suggestions for vacation coverage
    for (const vacEmp of withVacation) {
      const availableCollaborators = underloaded.filter(
        (u) => u.employee.id !== vacEmp.employee.id
      )

      if (availableCollaborators.length > 0) {
        const bestMatch = availableCollaborators.sort(
          (a, b) => (b.availableHours - b.plannedHours) - (a.availableHours - a.plannedHours)
        )[0]

        suggestions.push({
          id: `vacation-${vacEmp.employee.id}`,
          type: "VACATION_COVER",
          priority: "MEDIUM",
          employeeId: vacEmp.employee.id,
          employeeName: vacEmp.employee.name,
          title: `Vakantie-vervanging voor ${vacEmp.employee.name}`,
          description: `${vacEmp.employee.name} heeft ${vacEmp.leaveHours.toFixed(0)} uur verlof deze maand. ${bestMatch.employee.name} heeft nog ${(bestMatch.availableHours - bestMatch.plannedHours).toFixed(0)} uur beschikbaar voor vervanging.`,
          suggestedAction: {
            type: "COVER",
            fromEmployeeId: vacEmp.employee.id,
            toEmployeeId: bestMatch.employee.id,
            hours: Math.min(vacEmp.leaveHours, bestMatch.availableHours - bestMatch.plannedHours),
          },
        })
      }
    }

    // Sort by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return NextResponse.json({
      year,
      month,
      suggestions,
      summary: {
        overloadedCount: overloaded.length,
        underloadedCount: underloaded.length,
        vacationCount: withVacation.length,
        suggestionCount: suggestions.length,
      },
    })
  } catch (error) {
    console.error("Error generating suggestions:", error)
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    )
  }
}
