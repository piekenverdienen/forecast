import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageClients } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  clientBudgetId: z.string().uuid().optional().nullable(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  invoiceNumber: z.string().optional().nullable(),
  amount: z.number().min(0),
  invoiceDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : null)),
  dueDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : null)),
  status: z.enum(["PENDING", "INVOICED", "PAID", "OVERDUE"]).default("PENDING"),
  notes: z.string().optional().nullable(),
})

// GET /api/invoices - Get all invoices with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const month = searchParams.get("month")
    const clientId = searchParams.get("clientId")
    const status = searchParams.get("status")

    const whereClause: any = {}
    if (year) whereClause.year = parseInt(year)
    if (month) whereClause.month = parseInt(month)
    if (clientId) whereClause.clientId = clientId
    if (status) whereClause.status = status

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            paymentTerm: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    )
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !canManageClients(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createInvoiceSchema.parse(body)

    // Get client to copy payment term
    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
      select: { paymentTerm: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const invoice = await prisma.invoice.create({
      data: {
        clientId: validatedData.clientId,
        clientBudgetId: validatedData.clientBudgetId,
        year: validatedData.year,
        month: validatedData.month,
        invoiceNumber: validatedData.invoiceNumber,
        amount: validatedData.amount,
        invoiceDate: validatedData.invoiceDate,
        dueDate: validatedData.dueDate,
        status: validatedData.status,
        paymentTerm: client.paymentTerm,
        notes: validatedData.notes,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            paymentTerm: true,
          },
        },
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating invoice:", error)
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    )
  }
}
