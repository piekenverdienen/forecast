import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageEmployees } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createLeaveSchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  hours: z.number().min(0),
  type: z.enum(["VACATION", "SICK", "OTHER"]),
  notes: z.string().optional().nullable(),
})

// GET /api/employees/[id]/leaves - Get all leaves for employee
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

    let whereClause: any = { employeeId: id }

    if (year && month) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0)

      whereClause = {
        ...whereClause,
        OR: [
          {
            startDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          {
            endDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          {
            AND: [
              { startDate: { lte: startOfMonth } },
              { endDate: { gte: endOfMonth } },
            ],
          },
        ],
      }
    }

    const leaves = await prisma.leave.findMany({
      where: whereClause,
      orderBy: { startDate: "desc" },
    })

    return NextResponse.json(leaves)
  } catch (error) {
    console.error("Error fetching leaves:", error)
    return NextResponse.json(
      { error: "Failed to fetch leaves" },
      { status: 500 }
    )
  }
}

// POST /api/employees/[id]/leaves - Create new leave
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = createLeaveSchema.parse(body)

    // Default status based on role
    const status = canManageEmployees(session.user.role) ? "APPROVED" : "PENDING"

    const leave = await prisma.leave.create({
      data: {
        employeeId: id,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        hours: validatedData.hours,
        type: validatedData.type,
        notes: validatedData.notes,
        status,
      },
    })

    return NextResponse.json(leave, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating leave:", error)
    return NextResponse.json(
      { error: "Failed to create leave" },
      { status: 500 }
    )
  }
}
