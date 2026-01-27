import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageClients } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createClientSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  timechimpId: z.string().optional().nullable(),
  clientType: z.enum(["B2B", "B2C"]).default("B2B"),
  classification: z.enum(["A", "B", "C", "D"]).default("C"),
  hourlyRate: z.number().min(0),
  paymentTerm: z.enum(["PREPAID", "POSTPAID"]).default("POSTPAID"),
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
})

// GET /api/clients - Get all clients
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    let budgetFilter = {}
    if (year && month) {
      budgetFilter = {
        budgets: {
          some: {
            year: parseInt(year),
            month: parseInt(month),
          },
        },
      }
    }

    const clients = await prisma.client.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...budgetFilter,
      },
      include: {
        budgets: year && month
          ? {
              where: {
                year: parseInt(year),
                month: parseInt(month),
              },
              include: {
                forecastEntries: {
                  include: {
                    employee: true,
                  },
                },
              },
            }
          : {
              orderBy: [{ year: "desc" }, { month: "desc" }],
              take: 12,
            },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    )
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canManageClients(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createClientSchema.parse(body)

    const client = await prisma.client.create({
      data: {
        name: validatedData.name,
        timechimpId: validatedData.timechimpId,
        clientType: validatedData.clientType,
        classification: validatedData.classification,
        hourlyRate: validatedData.hourlyRate,
        paymentTerm: validatedData.paymentTerm,
        contractStart: validatedData.contractStart,
        contractEnd: validatedData.contractEnd,
        notes: validatedData.notes,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating client:", error)
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    )
  }
}
