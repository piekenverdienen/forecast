"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { useMonth } from "@/components/layout/month-context"
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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Edit, Archive } from "lucide-react"
import { formatCurrency, getDutchMonth } from "@/lib/utils"

interface Client {
  id: string
  name: string
  clientType: string
  classification: string
  hourlyRate: number
  paymentTerm: string
  isActive: boolean
  notes: string | null
  budgets: {
    id: string
    year: number
    month: number
    totalBudget: number
    budgetType: string
  }[]
}

export default function ClientsPage() {
  const { data: session } = useSession()
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false)

  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "PLANNER"

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    clientType: "B2B",
    classification: "C",
    hourlyRate: "100",
    paymentTerm: "POSTPAID",
    notes: "",
  })

  const [budgetForm, setBudgetForm] = useState({
    totalBudget: "",
    budgetType: "SUBSCRIPTION",
    prospectProbability: "0.5",
    endMonth: "12", // Default to end of year
    useEndMonth: true, // Toggle for multi-month
  })

  const fetchClients = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/clients?year=${selectedYear}&month=${selectedMonth}&includeInactive=true`)
      if (res.ok) {
        const data = await res.json()
        setClients(data)
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [selectedYear, selectedMonth])

  const handleAddClient = async () => {
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          clientType: formData.clientType,
          classification: formData.classification,
          hourlyRate: parseFloat(formData.hourlyRate),
          paymentTerm: formData.paymentTerm,
          notes: formData.notes || null,
        }),
      })

      if (res.ok) {
        setIsAddDialogOpen(false)
        setFormData({ name: "", clientType: "B2B", classification: "C", hourlyRate: "100", paymentTerm: "POSTPAID", notes: "" })
        fetchClients()
      }
    } catch (error) {
      console.error("Failed to add client:", error)
    }
  }

  const handleEditClient = async () => {
    if (!selectedClient) return

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          clientType: formData.clientType,
          classification: formData.classification,
          hourlyRate: parseFloat(formData.hourlyRate),
          paymentTerm: formData.paymentTerm,
          notes: formData.notes || null,
        }),
      })

      if (res.ok) {
        setIsEditDialogOpen(false)
        fetchClients()
      }
    } catch (error) {
      console.error("Failed to update client:", error)
    }
  }

  const handleArchive = async (clientId: string) => {
    if (!confirm("Weet je zeker dat je deze klant wilt archiveren?")) return

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchClients()
      }
    } catch (error) {
      console.error("Failed to archive client:", error)
    }
  }

  const handleAddBudget = async () => {
    if (!selectedClient) return

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
          endMonth: budgetForm.useEndMonth ? parseInt(budgetForm.endMonth) : undefined,
          totalBudget: parseFloat(budgetForm.totalBudget),
          budgetType: budgetForm.budgetType,
          prospectProbability: budgetForm.budgetType === "PROSPECT"
            ? parseFloat(budgetForm.prospectProbability)
            : null,
        }),
      })

      if (res.ok) {
        setIsBudgetDialogOpen(false)
        setBudgetForm({ totalBudget: "", budgetType: "SUBSCRIPTION", prospectProbability: "0.5", endMonth: "12", useEndMonth: true })
        fetchClients()
      }
    } catch (error) {
      console.error("Failed to add budget:", error)
    }
  }

  const openEditDialog = (client: Client) => {
    setSelectedClient(client)
    setFormData({
      name: client.name,
      clientType: client.clientType,
      classification: client.classification,
      hourlyRate: client.hourlyRate.toString(),
      paymentTerm: client.paymentTerm || "POSTPAID",
      notes: client.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const openBudgetDialog = (client: Client) => {
    setSelectedClient(client)
    setBudgetForm({
      totalBudget: "",
      budgetType: "SUBSCRIPTION",
      prospectProbability: "0.5",
      endMonth: "12",
      useEndMonth: true
    })
    setIsBudgetDialogOpen(true)
  }

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getClassificationBadge = (classification: string) => {
    const variants: Record<string, "default" | "secondary" | "success" | "warning"> = {
      A: "success",
      B: "default",
      C: "secondary",
      D: "warning",
    }
    return <Badge variant={variants[classification] || "secondary"}>{classification}-klant</Badge>
  }

  const getCurrentMonthBudget = (client: Client) => {
    return client.budgets
      .filter((b) => b.year === selectedYear && b.month === selectedMonth)
      .reduce((sum, b) => sum + b.totalBudget, 0)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Header
          title="Klanten"
          subtitle="Beheer klanten en budgetten"
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
        title="Klanten"
        subtitle="Beheer klanten en budgetten"
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      <div className="p-6 space-y-6">
        {/* Actions bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Zoek klant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {canEdit && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Klant toevoegen
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{clients.filter((c) => c.isActive).length}</div>
              <p className="text-sm text-muted-foreground">Actieve klanten</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {formatCurrency(clients.reduce((sum, c) => sum + getCurrentMonthBudget(c), 0))}
              </div>
              <p className="text-sm text-muted-foreground">Budget {getDutchMonth(selectedMonth)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{clients.filter((c) => c.clientType === "B2B").length}</div>
              <p className="text-sm text-muted-foreground">B2B klanten</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{clients.filter((c) => c.clientType === "B2C").length}</div>
              <p className="text-sm text-muted-foreground">B2C klanten</p>
            </CardContent>
          </Card>
        </div>

        {/* Client Table */}
        <Card>
          <CardHeader>
            <CardTitle>Klanten Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Classificatie</TableHead>
                  <TableHead className="text-right">Uurtarief</TableHead>
                  <TableHead className="text-right">Budget {getDutchMonth(selectedMonth)}</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Acties</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className={!client.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="font-medium">{client.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.clientType}</Badge>
                    </TableCell>
                    <TableCell>{getClassificationBadge(client.classification)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(client.hourlyRate)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(getCurrentMonthBudget(client))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? "success" : "secondary"}>
                        {client.isActive ? "Actief" : "Gearchiveerd"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openBudgetDialog(client)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Budget
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {client.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArchive(client.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredClients.length === 0 && (
              <div className="text-center py-8 text-gray-500">Geen klanten gevonden</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klant toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Klantnaam"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.clientType}
                  onValueChange={(value) => setFormData({ ...formData, clientType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classificatie</Label>
                <Select
                  value={formData.classification}
                  onValueChange={(value) => setFormData({ ...formData, classification: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A-klant</SelectItem>
                    <SelectItem value="B">B-klant</SelectItem>
                    <SelectItem value="C">C-klant</SelectItem>
                    <SelectItem value="D">D-klant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Uurtarief (€)</Label>
                <Input
                  id="rate"
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Betalingstermijn</Label>
                <Select
                  value={formData.paymentTerm}
                  onValueChange={(value) => setFormData({ ...formData, paymentTerm: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREPAID">Vooraf</SelectItem>
                    <SelectItem value="POSTPAID">Achteraf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optionele notities..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddClient}>Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klant bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Naam</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.clientType}
                  onValueChange={(value) => setFormData({ ...formData, clientType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B2B">B2B</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classificatie</Label>
                <Select
                  value={formData.classification}
                  onValueChange={(value) => setFormData({ ...formData, classification: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A-klant</SelectItem>
                    <SelectItem value="B">B-klant</SelectItem>
                    <SelectItem value="C">C-klant</SelectItem>
                    <SelectItem value="D">D-klant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-rate">Uurtarief (€)</Label>
                <Input
                  id="edit-rate"
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Betalingstermijn</Label>
                <Select
                  value={formData.paymentTerm}
                  onValueChange={(value) => setFormData({ ...formData, paymentTerm: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREPAID">Vooraf</SelectItem>
                    <SelectItem value="POSTPAID">Achteraf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleEditClient}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Budget Dialog */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Budget toevoegen - {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Budget type</Label>
              <Select
                value={budgetForm.budgetType}
                onValueChange={(value) => setBudgetForm({ ...budgetForm, budgetType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBSCRIPTION">Abonnement</SelectItem>
                  <SelectItem value="PROJECT">Project</SelectItem>
                  <SelectItem value="PROSPECT">Prospect</SelectItem>
                  <SelectItem value="TOOLING">Tooling</SelectItem>
                  <SelectItem value="NACALCULATIE">Nacalculatie</SelectItem>
                  <SelectItem value="INHUUR">Inhuur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Selection */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useEndMonth"
                  checked={budgetForm.useEndMonth}
                  onChange={(e) => setBudgetForm({ ...budgetForm, useEndMonth: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="useEndMonth" className="font-normal cursor-pointer">
                  Budget voor meerdere maanden
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Startmaand</Label>
                  <div className="text-sm font-medium">
                    {getDutchMonth(selectedMonth)} {selectedYear}
                  </div>
                </div>
                {budgetForm.useEndMonth && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Eindmaand</Label>
                    <Select
                      value={budgetForm.endMonth}
                      onValueChange={(value) => setBudgetForm({ ...budgetForm, endMonth: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                          <SelectItem key={m} value={m.toString()}>
                            {getDutchMonth(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {budgetForm.useEndMonth && (
                <p className="text-xs text-muted-foreground">
                  Budget wordt aangemaakt van {getDutchMonth(selectedMonth)} t/m {getDutchMonth(parseInt(budgetForm.endMonth))} {selectedYear}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget per maand (€)</Label>
              <Input
                id="budget"
                type="number"
                value={budgetForm.totalBudget}
                onChange={(e) => setBudgetForm({ ...budgetForm, totalBudget: e.target.value })}
                placeholder="0.00"
              />
            </div>
            {budgetForm.budgetType === "PROSPECT" && (
              <div className="space-y-2">
                <Label htmlFor="probability">Kans (0-1)</Label>
                <Input
                  id="probability"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={budgetForm.prospectProbability}
                  onChange={(e) => setBudgetForm({ ...budgetForm, prospectProbability: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddBudget}>
              {budgetForm.useEndMonth ? `Toevoegen (${parseInt(budgetForm.endMonth) - selectedMonth + 1} maanden)` : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
