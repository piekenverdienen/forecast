import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/invoices/check - Check for missing invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())

    // Get all active clients with budgets for this month
    const clientsWithBudgets = await prisma.client.findMany({
      where: {
        isActive: true,
        budgets: {
          some: {
            year,
            month,
            totalBudget: { gt: 0 },
          },
        },
      },
      include: {
        budgets: {
          where: {
            year,
            month,
          },
        },
        invoices: {
          where: {
            year,
            month,
          },
        },
      },
    })

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    const missingInvoices: {
      clientId: string
      clientName: string
      paymentTerm: string
      budgetAmount: number
      invoicedAmount: number
      difference: number
      expectedInvoiceMonth: number
      expectedInvoiceYear: number
      isOverdue: boolean
    }[] = []

    for (const client of clientsWithBudgets) {
      const totalBudget = client.budgets.reduce((sum, b) => sum + b.totalBudget, 0)
      const totalInvoiced = client.invoices.reduce((sum, i) => sum + i.amount, 0)
      const difference = totalBudget - totalInvoiced

      if (difference > 0) {
        // Calculate expected invoice month based on payment term
        let expectedMonth: number
        let expectedYear: number

        if (client.paymentTerm === "PREPAID") {
          // Prepaid: Invoice at beginning of month (so the same month)
          expectedMonth = month
          expectedYear = year
        } else {
          // Postpaid: Invoice after the month ends
          expectedMonth = month === 12 ? 1 : month + 1
          expectedYear = month === 12 ? year + 1 : year
        }

        // Check if overdue
        const isOverdue =
          expectedYear < currentYear ||
          (expectedYear === currentYear && expectedMonth < currentMonth)

        missingInvoices.push({
          clientId: client.id,
          clientName: client.name,
          paymentTerm: client.paymentTerm,
          budgetAmount: totalBudget,
          invoicedAmount: totalInvoiced,
          difference,
          expectedInvoiceMonth: expectedMonth,
          expectedInvoiceYear: expectedYear,
          isOverdue,
        })
      }
    }

    // Sort by overdue first, then by difference
    missingInvoices.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      return b.difference - a.difference
    })

    return NextResponse.json({
      year,
      month,
      missingInvoices,
      totalMissing: missingInvoices.reduce((sum, m) => sum + m.difference, 0),
      overdueCount: missingInvoices.filter((m) => m.isOverdue).length,
    })
  } catch (error) {
    console.error("Error checking invoices:", error)
    return NextResponse.json(
      { error: "Failed to check invoices" },
      { status: 500 }
    )
  }
}
