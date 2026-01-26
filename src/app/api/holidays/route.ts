import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageEmployees } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createHolidaySchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  name: z.string().min(1),
  year: z.number().int(),
})

// GET /api/holidays - Get public holidays
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

    const holidays = await prisma.publicHoliday.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    })

    return NextResponse.json(holidays)
  } catch (error) {
    console.error("Error fetching holidays:", error)
    return NextResponse.json(
      { error: "Failed to fetch holidays" },
      { status: 500 }
    )
  }
}

// POST /api/holidays - Create public holiday
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canManageEmployees(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createHolidaySchema.parse(body)

    const holiday = await prisma.publicHoliday.create({
      data: {
        date: validatedData.date,
        name: validatedData.name,
        year: validatedData.year,
      },
    })

    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating holiday:", error)
    return NextResponse.json(
      { error: "Failed to create holiday" },
      { status: 500 }
    )
  }
}
