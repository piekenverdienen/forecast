import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageClients } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  timechimpId: z.string().optional().nullable(),
  clientType: z.enum(["B2B", "B2C"]).optional(),
  classification: z.enum(["A", "B", "C", "D"]).optional(),
  hourlyRate: z.number().min(0).optional(),
  contractStart: z
    .string()
    .optional()
    .nullable()
    .transform((str) => (str ? new Date(str) : null)),
  contractEnd: z
    .string()
    .optional()
    .nullable()
    .transform((str) => (str ? new Date(str) : null)),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

// GET /api/clients/[id] - Get single client
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

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        budgets: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          include: {
            forecastEntries: {
              include: {
                employee: true,
              },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: "Klant niet gevonden" },
        { status: 404 }
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Update client
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
    const validatedData = updateClientSchema.parse(body)

    const client = await prisma.client.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(client)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating client:", error)
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Archive client (soft delete)
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

    const client = await prisma.client.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error archiving client:", error)
    return NextResponse.json(
      { error: "Failed to archive client" },
      { status: 500 }
    )
  }
}
