import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canEditForecast } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateEntrySchema = z.object({
  employeeId: z.string().uuid().optional(),
  taskDescription: z.string().min(1).optional(),
  budgetAmount: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
})

// GET /api/forecast/entries/[id] - Get single forecast entry
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

    const entry = await prisma.forecastEntry.findUnique({
      where: { id },
      include: {
        employee: true,
        clientBudget: {
          include: {
            client: true,
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Forecast entry niet gevonden" },
        { status: 404 }
      )
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error("Error fetching forecast entry:", error)
    return NextResponse.json(
      { error: "Failed to fetch forecast entry" },
      { status: 500 }
    )
  }
}

// PUT /api/forecast/entries/[id] - Update forecast entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canEditForecast(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateEntrySchema.parse(body)

    const entry = await prisma.forecastEntry.update({
      where: { id },
      data: validatedData,
      include: {
        employee: true,
        clientBudget: {
          include: {
            client: true,
          },
        },
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating forecast entry:", error)
    return NextResponse.json(
      { error: "Failed to update forecast entry" },
      { status: 500 }
    )
  }
}

// DELETE /api/forecast/entries/[id] - Delete forecast entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canEditForecast(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

    await prisma.forecastEntry.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting forecast entry:", error)
    return NextResponse.json(
      { error: "Failed to delete forecast entry" },
      { status: 500 }
    )
  }
}
