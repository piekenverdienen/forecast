import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageEmployees } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  timechimpId: z.string().optional().nullable(),
  hourlyRate: z.number().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/employees/[id] - Get single employee
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

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        contracts: {
          orderBy: { startDate: "desc" },
        },
        leaves: {
          orderBy: { startDate: "desc" },
        },
        forecastEntries: {
          include: {
            clientBudget: {
              include: {
                client: true,
              },
            },
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: "Medewerker niet gevonden" },
        { status: 404 }
      )
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error("Error fetching employee:", error)
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    )
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
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
    const validatedData = updateEmployeeSchema.parse(body)

    // Check if email is being changed and if it's already in use
    if (validatedData.email) {
      const existingEmployee = await prisma.employee.findUnique({
        where: { email: validatedData.email },
      })

      if (existingEmployee && existingEmployee.id !== id) {
        return NextResponse.json(
          { error: "E-mailadres is al in gebruik" },
          { status: 400 }
        )
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: validatedData,
      include: {
        contracts: {
          orderBy: { startDate: "desc" },
        },
      },
    })

    return NextResponse.json(employee)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating employee:", error)
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    )
  }
}

// DELETE /api/employees/[id] - Deactivate employee (soft delete)
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

    const employee = await prisma.employee.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error("Error deactivating employee:", error)
    return NextResponse.json(
      { error: "Failed to deactivate employee" },
      { status: 500 }
    )
  }
}
