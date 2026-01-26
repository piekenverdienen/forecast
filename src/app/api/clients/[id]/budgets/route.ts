import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageClients } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createBudgetSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
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

// POST /api/clients/[id]/budgets - Create new budget
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

    // Check if budget already exists for this period and type
    const existingBudget = await prisma.clientBudget.findUnique({
      where: {
        clientId_year_month_budgetType: {
          clientId: id,
          year: validatedData.year,
          month: validatedData.month,
          budgetType: validatedData.budgetType,
        },
      },
    })

    if (existingBudget) {
      return NextResponse.json(
        { error: "Budget voor deze periode en type bestaat al" },
        { status: 400 }
      )
    }

    const budget = await prisma.clientBudget.create({
      data: {
        clientId: id,
        year: validatedData.year,
        month: validatedData.month,
        totalBudget: validatedData.totalBudget,
        budgetType: validatedData.budgetType,
        prospectProbability: validatedData.prospectProbability,
      },
    })

    return NextResponse.json(budget, { status: 201 })
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
