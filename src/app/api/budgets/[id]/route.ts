import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageClients } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateBudgetSchema = z.object({
  totalBudget: z.number().min(0).optional(),
  budgetType: z
    .enum([
      "SUBSCRIPTION",
      "PROJECT",
      "PROSPECT",
      "TOOLING",
      "NACALCULATIE",
      "INHUUR",
    ])
    .optional(),
  prospectProbability: z.number().min(0).max(1).optional().nullable(),
})

// GET /api/budgets/[id] - Get single budget
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

    const budget = await prisma.clientBudget.findUnique({
      where: { id },
      include: {
        client: true,
        forecastEntries: {
          include: {
            employee: true,
          },
        },
      },
    })

    if (!budget) {
      return NextResponse.json(
        { error: "Budget niet gevonden" },
        { status: 404 }
      )
    }

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Error fetching budget:", error)
    return NextResponse.json(
      { error: "Failed to fetch budget" },
      { status: 500 }
    )
  }
}

// PUT /api/budgets/[id] - Update budget
export async function PUT(
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
    const validatedData = updateBudgetSchema.parse(body)

    const budget = await prisma.clientBudget.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(budget)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating budget:", error)
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    )
  }
}

// DELETE /api/budgets/[id] - Delete budget
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canManageClients(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

    // First delete all forecast entries
    await prisma.forecastEntry.deleteMany({
      where: { clientBudgetId: id },
    })

    // Then delete the budget
    await prisma.clientBudget.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting budget:", error)
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    )
  }
}
