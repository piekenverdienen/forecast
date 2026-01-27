import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageClients } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createBudgetSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  endMonth: z.number().int().min(1).max(12).optional(), // For multi-month budgets
  totalBudget: z.number().min(0),
  budgetType: z.enum([
    "SUBSCRIPTION",
    "PROJECT",
    "PROSPECT",
    "TOOLING",
    "NACALCULATIE",
    "INHUUR",
  ]),
  prospectProbability: z.number().min(0).max(1).optional().nullable(),
})

// GET /api/clients/[id]/budgets - Get all budgets for client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    let whereClause: any = { clientId: id }

    if (year) {
      whereClause.year = parseInt(year)
    }
    if (month) {
      whereClause.month = parseInt(month)
    }

    const budgets = await prisma.clientBudget.findMany({
      where: whereClause,
      include: {
        forecastEntries: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })

    return NextResponse.json(budgets)
  } catch (error) {
    console.error("Error fetching budgets:", error)
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/budgets - Create new budget (supports multi-month)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canManageClients(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = createBudgetSchema.parse(body)

    const startMonth = validatedData.month
    const endMonth = validatedData.endMonth || validatedData.month

    // Generate list of months to create budgets for
    const months: number[] = []
    if (endMonth >= startMonth) {
      for (let m = startMonth; m <= endMonth; m++) {
        months.push(m)
      }
    } else {
      // Handle year wrap (e.g., November to February)
      for (let m = startMonth; m <= 12; m++) {
        months.push(m)
      }
      for (let m = 1; m <= endMonth; m++) {
        months.push(m)
      }
    }

    // Check which months already have budgets
    const existingBudgets = await prisma.clientBudget.findMany({
      where: {
        clientId: id,
        year: validatedData.year,
        month: { in: months },
        budgetType: validatedData.budgetType,
      },
    })

    const existingMonths = existingBudgets.map((b) => b.month)
    const monthsToCreate = months.filter((m) => !existingMonths.includes(m))

    if (monthsToCreate.length === 0) {
      return NextResponse.json(
        { error: "Budgetten voor alle geselecteerde maanden bestaan al" },
        { status: 400 }
      )
    }

    // Create budgets for all requested months
    const createdBudgets = await prisma.$transaction(
      monthsToCreate.map((month) =>
        prisma.clientBudget.create({
          data: {
            clientId: id,
            year: validatedData.year,
            month,
            totalBudget: validatedData.totalBudget,
            budgetType: validatedData.budgetType,
            prospectProbability: validatedData.prospectProbability,
          },
        })
      )
    )

    return NextResponse.json({
      created: createdBudgets,
      skipped: existingMonths,
      message: `${createdBudgets.length} budget(ten) aangemaakt${existingMonths.length > 0 ? `, ${existingMonths.length} overgeslagen (bestonden al)` : ''}`
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating budget:", error)
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    )
  }
}
