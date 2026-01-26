import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageEmployees } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createContractSchema = z.object({
  hoursPerWeek: z.number().min(0).max(60),
  billableTarget: z.number().min(0).max(1).default(0.8),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z
    .string()
    .optional()
    .nullable()
    .transform((str) => (str ? new Date(str) : null)),
})

// GET /api/employees/[id]/contracts - Get all contracts for employee
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

    const contracts = await prisma.employeeContract.findMany({
      where: { employeeId: id },
      orderBy: { startDate: "desc" },
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error("Error fetching contracts:", error)
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    )
  }
}

// POST /api/employees/[id]/contracts - Create new contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canManageEmployees(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = createContractSchema.parse(body)

    // End the current active contract if exists
    await prisma.employeeContract.updateMany({
      where: {
        employeeId: id,
        endDate: null,
      },
      data: {
        endDate: new Date(
          validatedData.startDate.getTime() - 24 * 60 * 60 * 1000
        ), // Day before new contract
      },
    })

    // Create new contract
    const contract = await prisma.employeeContract.create({
      data: {
        employeeId: id,
        hoursPerWeek: validatedData.hoursPerWeek,
        billableTarget: validatedData.billableTarget,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
      },
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating contract:", error)
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    )
  }
}
