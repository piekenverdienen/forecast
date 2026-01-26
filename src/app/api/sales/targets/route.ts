import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageSalesTargets } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createTargetSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  targetAmount: z.number().min(0),
  avgClientValue: z.number().min(0),
})

// GET /api/sales/targets - Get sales targets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")

    let whereClause = {}
    if (year) {
      whereClause = { year: parseInt(year) }
    }

    const targets = await prisma.salesTarget.findMany({
      where: whereClause,
      orderBy: [{ year: "asc" }, { month: "asc" }],
    })

    return NextResponse.json(targets)
  } catch (error) {
    console.error("Error fetching sales targets:", error)
    return NextResponse.json(
      { error: "Failed to fetch sales targets" },
      { status: 500 }
    )
  }
}

// POST /api/sales/targets - Create or update sales target
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canManageSalesTargets(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createTargetSchema.parse(body)

    const target = await prisma.salesTarget.upsert({
      where: {
        year_month: {
          year: validatedData.year,
          month: validatedData.month,
        },
      },
      update: {
        targetAmount: validatedData.targetAmount,
        avgClientValue: validatedData.avgClientValue,
      },
      create: {
        year: validatedData.year,
        month: validatedData.month,
        targetAmount: validatedData.targetAmount,
        avgClientValue: validatedData.avgClientValue,
      },
    })

    return NextResponse.json(target, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating sales target:", error)
    return NextResponse.json(
      { error: "Failed to create sales target" },
      { status: 500 }
    )
  }
}
