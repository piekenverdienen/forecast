import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canEditForecast } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createEntrySchema = z.object({
  clientBudgetId: z.string().uuid(),
  employeeId: z.string().uuid(),
  taskDescription: z.string().min(1, "Taakomschrijving is verplicht"),
  budgetAmount: z.number().min(0),
  notes: z.string().optional().nullable(),
})

// GET /api/forecast/entries - Get forecast entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientBudgetId = searchParams.get("clientBudgetId")
    const employeeId = searchParams.get("employeeId")
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    let whereClause: any = {}

    if (clientBudgetId) {
      whereClause.clientBudgetId = clientBudgetId
    }

    if (employeeId) {
      whereClause.employeeId = employeeId
    }

    if (year && month) {
      whereClause.clientBudget = {
        year: parseInt(year),
        month: parseInt(month),
      }
    }

    const entries = await prisma.forecastEntry.findMany({
      where: whereClause,
      include: {
        employee: true,
        clientBudget: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error("Error fetching forecast entries:", error)
    return NextResponse.json(
      { error: "Failed to fetch forecast entries" },
      { status: 500 }
    )
  }
}

// POST /api/forecast/entries - Create new forecast entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canEditForecast(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createEntrySchema.parse(body)

    // Verify the budget exists
    const budget = await prisma.clientBudget.findUnique({
      where: { id: validatedData.clientBudgetId },
    })

    if (!budget) {
      return NextResponse.json(
        { error: "Budget niet gevonden" },
        { status: 404 }
      )
    }

    // Verify the employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: validatedData.employeeId },
    })

    if (!employee) {
      return NextResponse.json(
        { error: "Medewerker niet gevonden" },
        { status: 404 }
      )
    }

    const entry = await prisma.forecastEntry.create({
      data: {
        clientBudgetId: validatedData.clientBudgetId,
        employeeId: validatedData.employeeId,
        taskDescription: validatedData.taskDescription,
        budgetAmount: validatedData.budgetAmount,
        notes: validatedData.notes,
      },
      include: {
        employee: true,
        clientBudget: {
          include: {
            client: true,
          },
        },
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating forecast entry:", error)
    return NextResponse.json(
      { error: "Failed to create forecast entry" },
      { status: 500 }
    )
  }
}
