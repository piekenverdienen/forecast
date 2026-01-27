import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, canManageClients } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().optional().nullable(),
  amount: z.number().min(0).optional(),
  invoiceDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : null)),
  dueDate: z.string().optional().nullable().transform((str) => (str ? new Date(str) : null)),
  status: z.enum(["PENDING", "INVOICED", "PAID", "OVERDUE"]).optional(),
  notes: z.string().optional().nullable(),
})

// GET /api/invoices/[id] - Get single invoice
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
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

    if (!invoice) {
      return NextResponse.json(
        { error: "Factuur niet gevonden" },
        { status: 404 }
      )
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    )
  }
}

// PUT /api/invoices/[id] - Update invoice
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
    const validatedData = updateInvoiceSchema.parse(body)

    const invoice = await prisma.invoice.update({
      where: { id },
      data: validatedData,
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

    return NextResponse.json(invoice)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating invoice:", error)
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    )
  }
}

// DELETE /api/invoices/[id] - Delete invoice
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

    await prisma.invoice.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    )
  }
}
