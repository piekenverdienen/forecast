"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useMonth } from "@/components/layout/month-context"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Check
} from "lucide-react"
import { formatCurrency, getDutchMonth } from "@/lib/utils"

interface MissingInvoice {
  clientId: string
  clientName: string
  paymentTerm: string
  budgetAmount: number
  invoicedAmount: number
  difference: number
  expectedInvoiceMonth: number
  expectedInvoiceYear: number
  isOverdue: boolean
}

interface Invoice {
  id: string
  clientId: string
  year: number
  month: number
  invoiceNumber: string | null
  amount: number
  invoiceDate: string | null
  status: string
  paymentTerm: string
  client: {
    id: string
    name: string
    paymentTerm: string
  }
}

interface CheckData {
  year: number
  month: number
  missingInvoices: MissingInvoice[]
  totalMissing: number
  overdueCount: number
}

export default function InvoicingPage() {
  const { data: session } = useSession()
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [checkData, setCheckData] = useState<CheckData | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMissing, setSelectedMissing] = useState<MissingInvoice | null>(null)

  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "PLANNER"

  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: "",
    amount: "",
    status: "INVOICED",
  })

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [checkRes, invoicesRes] = await Promise.all([
        fetch(`/api/invoices/check?year=${selectedYear}&month=${selectedMonth}`),
        fetch(`/api/invoices?year=${selectedYear}&month=${selectedMonth}`),
      ])

      if (checkRes.ok) {
        const data = await checkRes.json()
        setCheckData(data)
      }

      if (invoicesRes.ok) {
        const data = await invoicesRes.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedMonth])

  const openMarkAsInvoiced = (missing: MissingInvoice) => {
    setSelectedMissing(missing)
    setInvoiceForm({
      invoiceNumber: "",
      amount: missing.difference.toString(),
      status: "INVOICED",
    })
    setIsDialogOpen(true)
  }

  const handleMarkAsInvoiced = async () => {
    if (!selectedMissing) return

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedMissing.clientId,
          year: selectedYear,
          month: selectedMonth,
          invoiceNumber: invoiceForm.invoiceNumber || null,
          amount: parseFloat(invoiceForm.amount),
          invoiceDate: new Date().toISOString(),
          status: invoiceForm.status,
        }),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error("Failed to create invoice:", error)
    }
  }

  const handleUpdateStatus = async (invoiceId: string, status: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Failed to update invoice:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success">Betaald</Badge>
      case "INVOICED":
        return <Badge variant="default">Gefactureerd</Badge>
      case "OVERDUE":
        return <Badge variant="danger">Te laat</Badge>
      default:
        return <Badge variant="secondary">Openstaand</Badge>
    }
  }

  const getPaymentTermBadge = (term: string) => {
    return term === "PREPAID" ? (
      <Badge variant="outline" className="text-blue-600 border-blue-300">Vooraf</Badge>
    ) : (
      <Badge variant="outline" className="text-amber-600 border-amber-300">Achteraf</Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Header
          title="Facturatie"
          subtitle={`Overzicht voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a365d]"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Facturatie"
        subtitle={`Overzicht voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        alertCount={checkData?.overdueCount || 0}
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Receipt className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{invoices.length}</div>
                  <p className="text-sm text-muted-foreground">Facturen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(invoices.reduce((sum, i) => sum + i.amount, 0))}
                  </div>
                  <p className="text-sm text-muted-foreground">Gefactureerd</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-amber-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {checkData?.missingInvoices.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Te factureren</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {checkData?.overdueCount || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Achterstallig</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Missing Invoices Alert */}
        {checkData && checkData.missingInvoices.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                Te Factureren ({checkData.missingInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Klant</TableHead>
                    <TableHead>Betalingstermijn</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Gefactureerd</TableHead>
                    <TableHead className="text-right">Verschil</TableHead>
                    <TableHead>Verwacht</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="text-right">Actie</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkData.missingInvoices.map((missing) => (
                    <TableRow key={missing.clientId} className={missing.isOverdue ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{missing.clientName}</TableCell>
                      <TableCell>{getPaymentTermBadge(missing.paymentTerm)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(missing.budgetAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(missing.invoicedAmount)}</TableCell>
                      <TableCell className="text-right font-medium text-amber-700">
                        {formatCurrency(missing.difference)}
                      </TableCell>
                      <TableCell>
                        {getDutchMonth(missing.expectedInvoiceMonth)} {missing.expectedInvoiceYear}
                      </TableCell>
                      <TableCell>
                        {missing.isOverdue ? (
                          <Badge variant="danger">Achterstallig</Badge>
                        ) : (
                          <Badge variant="warning">Openstaand</Badge>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openMarkAsInvoiced(missing)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Markeren
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Completed Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Facturen {getDutchMonth(selectedMonth)} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Klant</TableHead>
                    <TableHead>Factuurnummer</TableHead>
                    <TableHead>Betalingstermijn</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="text-right">Acties</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.client.name}</TableCell>
                      <TableCell>{invoice.invoiceNumber || "-"}</TableCell>
                      <TableCell>{getPaymentTermBadge(invoice.paymentTerm)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>
                        {invoice.invoiceDate
                          ? new Date(invoice.invoiceDate).toLocaleDateString("nl-NL")
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Select
                            value={invoice.status}
                            onValueChange={(value) => handleUpdateStatus(invoice.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Openstaand</SelectItem>
                              <SelectItem value="INVOICED">Gefactureerd</SelectItem>
                              <SelectItem value="PAID">Betaald</SelectItem>
                              <SelectItem value="OVERDUE">Te laat</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Geen facturen voor deze maand</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Term Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-600 border-blue-300">Vooraf</Badge>
                <span className="text-muted-foreground">
                  Factuur op 1e van de maand voor dezelfde maand (bv. 1 feb factureren voor feb)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-amber-600 border-amber-300">Achteraf</Badge>
                <span className="text-muted-foreground">
                  Factuur op 1e van volgende maand (bv. 1 feb factureren voor jan)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mark as Invoiced Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Factuur Registreren - {selectedMissing?.clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Maand:</span>
                <span>{getDutchMonth(selectedMonth)} {selectedYear}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Betalingstermijn:</span>
                <span>{selectedMissing?.paymentTerm === "PREPAID" ? "Vooraf" : "Achteraf"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Te factureren:</span>
                <span className="font-medium">{formatCurrency(selectedMissing?.difference || 0)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Factuurnummer</Label>
              <Input
                id="invoiceNumber"
                value={invoiceForm.invoiceNumber}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                placeholder="Optioneel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Bedrag (€)</Label>
              <Input
                id="amount"
                type="number"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={invoiceForm.status}
                onValueChange={(value) => setInvoiceForm({ ...invoiceForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVOICED">Gefactureerd</SelectItem>
                  <SelectItem value="PAID">Betaald</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleMarkAsInvoiced}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Registreren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
