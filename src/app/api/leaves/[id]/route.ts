import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageEmployees } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateLeaveSchema = z.object({
  startDate: z
    .string()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
  hours: z.number().min(0).optional(),
  type: z.enum(["VACATION", "SICK", "OTHER"]).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  notes: z.string().optional().nullable(),
})

// GET /api/leaves/[id] - Get single leave
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

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        employee: true,
      },
    })

    if (!leave) {
      return NextResponse.json(
        { error: "Verlof niet gevonden" },
        { status: 404 }
      )
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error("Error fetching leave:", error)
    return NextResponse.json(
      { error: "Failed to fetch leave" },
      { status: 500 }
    )
  }
}

// PUT /api/leaves/[id] - Update leave
export async function PUT(
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
    const validatedData = updateLeaveSchema.parse(body)

    // Only admins/planners can change status
    if (
      validatedData.status &&
      !canManageEmployees(session.user.role)
    ) {
      return NextResponse.json(
        { error: "Niet geautoriseerd om status te wijzigen" },
        { status: 403 }
      )
    }

    const leave = await prisma.leave.update({
      where: { id },
      data: validatedData,
      include: {
        employee: true,
      },
    })

    return NextResponse.json(leave)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating leave:", error)
    return NextResponse.json(
      { error: "Failed to update leave" },
      { status: 500 }
    )
  }
}

// DELETE /api/leaves/[id] - Delete leave
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canManageEmployees(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

    await prisma.leave.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting leave:", error)
    return NextResponse.json(
      { error: "Failed to delete leave" },
      { status: 500 }
    )
  }
}
