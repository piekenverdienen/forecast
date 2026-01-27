import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().optional().nullable(),
  category: z.enum(["GENERAL", "CAPACITY", "INVOICING", "NOTIFICATIONS"]).optional(),
})

const defaultSettings = [
  { key: "company_name", value: "YourFellow", description: "Bedrijfsnaam", category: "GENERAL" },
  { key: "default_hourly_rate", value: "125", description: "Standaard uurtarief", category: "GENERAL" },
  { key: "default_billable_target", value: "0.80", description: "Standaard declarabel percentage", category: "CAPACITY" },
  { key: "default_hours_per_week", value: "40", description: "Standaard uren per week", category: "CAPACITY" },
  { key: "invoice_prefix", value: "INV-", description: "Factuur prefix", category: "INVOICING" },
  { key: "payment_term_days", value: "30", description: "Betalingstermijn (dagen)", category: "INVOICING" },
  { key: "alert_threshold_overload", value: "0.90", description: "Overbezetting drempel", category: "CAPACITY" },
  { key: "alert_threshold_warning", value: "0.80", description: "Waarschuwing drempel", category: "CAPACITY" },
  { key: "fiscal_year_start", value: "1", description: "Start maand boekjaar", category: "GENERAL" },
]

// GET /api/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get settings from database
    let settings = await prisma.settings.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    })

    // If no settings exist, initialize with defaults
    if (settings.length === 0) {
      await prisma.$transaction(
        defaultSettings.map((setting) =>
          prisma.settings.create({
            data: setting,
          })
        )
      )
      settings = await prisma.settings.findMany({
        orderBy: [{ category: "asc" }, { key: "asc" }],
      })
    }

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      const category = setting.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(setting)
      return acc
    }, {} as Record<string, typeof settings>)

    return NextResponse.json({
      settings,
      grouped,
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Update a setting
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateSettingSchema.parse(body)

    const setting = await prisma.settings.upsert({
      where: { key: validatedData.key },
      update: {
        value: validatedData.value,
        description: validatedData.description,
        category: validatedData.category,
      },
      create: {
        key: validatedData.key,
        value: validatedData.value,
        description: validatedData.description,
        category: validatedData.category || "GENERAL",
      },
    })

    return NextResponse.json(setting)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating setting:", error)
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    )
  }
}

// POST /api/settings/reset - Reset to defaults
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete all settings and recreate defaults
    await prisma.settings.deleteMany({})
    await prisma.$transaction(
      defaultSettings.map((setting) =>
        prisma.settings.create({
          data: setting,
        })
      )
    )

    const settings = await prisma.settings.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    })

    return NextResponse.json({
      message: "Settings reset to defaults",
      settings,
    })
  } catch (error) {
    console.error("Error resetting settings:", error)
    return NextResponse.json(
      { error: "Failed to reset settings" },
      { status: 500 }
    )
  }
}
