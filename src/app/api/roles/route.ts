import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  billableTarget: z.number().min(0).max(1).default(0.8),
  isDefault: z.boolean().default(false),
})

const defaultRoles = [
  { name: "Consultant", description: "Standaard consultant", billableTarget: 0.80, isDefault: true },
  { name: "Senior Consultant", description: "Senior consultant", billableTarget: 0.80, isDefault: false },
  { name: "Manager", description: "Team manager", billableTarget: 0.60, isDefault: false },
  { name: "Partner", description: "Partner", billableTarget: 0.40, isDefault: false },
  { name: "Stagiair", description: "Stagiair", billableTarget: 0.70, isDefault: false },
]

// GET /api/roles - Get all roles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
    })

    // If no roles exist, initialize with defaults
    if (roles.length === 0) {
      await prisma.$transaction(
        defaultRoles.map((role) =>
          prisma.role.create({
            data: role,
          })
        )
      )
      roles = await prisma.role.findMany({
        orderBy: { name: "asc" },
      })
    }

    return NextResponse.json(roles)
  } catch (error) {
    console.error("Error fetching roles:", error)
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    )
  }
}

// POST /api/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createRoleSchema.parse(body)

    // If this is marked as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.role.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const role = await prisma.role.create({
      data: validatedData,
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating role:", error)
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    )
  }
}
