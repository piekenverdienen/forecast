import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageEmployees } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres"),
  timechimpId: z.string().optional().nullable(),
  hourlyRate: z.number().default(125),
  hoursPerWeek: z.number().min(0).max(60),
  billableTarget: z.number().min(0).max(1).default(0.8),
})

// GET /api/employees - Get all employees
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    const employees = await prisma.employee.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        contracts: {
          orderBy: { startDate: "desc" },
        },
        leaves: {
          where: {
            status: "APPROVED",
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    )
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canManageEmployees(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createEmployeeSchema.parse(body)

    // Check if email already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: validatedData.email },
    })

    if (existingEmployee) {
      return NextResponse.json(
        { error: "E-mailadres is al in gebruik" },
        { status: 400 }
      )
    }

    // Create employee with initial contract
    const employee = await prisma.employee.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        timechimpId: validatedData.timechimpId,
        hourlyRate: validatedData.hourlyRate,
        contracts: {
          create: {
            hoursPerWeek: validatedData.hoursPerWeek,
            billableTarget: validatedData.billableTarget,
            startDate: new Date(),
          },
        },
      },
      include: {
        contracts: true,
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating employee:", error)
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    )
  }
}
