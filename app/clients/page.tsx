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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Edit, Archive, ChevronDown, ChevronRight } from "lucide-react"
import { formatCurrency, getDutchMonth } from "@/lib/utils"

interface Budget {
  id: string
  year: number
  month: number
  totalBudget: number
  budgetType: string
  hourlyRate?: number | null
  prospectProbability?: number | null
}

interface Client {
  id: string
  name: string
  clientType: string
  classification: string
  hourlyRate: number
  isActive: boolean
  notes: string | null
  budgets: Budget[]
}

const BUDGET_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Abonnement",
  PROJECT: "Project",
  PROSPECT: "Prospect",
  TOOLING: "Tooling",
  NACALCULATIE: "Nacalculatie",
  INHUUR: "Inhuur",
}

const BUDGET_TYPE_COLORS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  SUBSCRIPTION: "success",
  PROJECT: "default",
  PROSPECT: "warning",
  TOOLING: "secondary",
  NACALCULATIE: "secondary",
  INHUUR: "secondary",
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
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "PLANNER"

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    clientType: "B2B",
    classification: "C",
    hourlyRate: "100",
    notes: "",
  })

  const [budgetForm, setBudgetForm] = useState({
    totalBudget: "",
    budgetType: "SUBSCRIPTION",
    prospectProbability: "0.5",
    hourlyRate: "",
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
    if (!formData.name.trim()) {
      alert("Vul een klantnaam in")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          clientType: formData.clientType,
          classification: formData.classification,
          hourlyRate: parseFloat(formData.hourlyRate) || 100,
          notes: formData.notes.trim() || null,
        }),
      })

      if (res.ok) {
        const newClient = await res.json()
        setClients((prev) => [...prev, newClient])
        setIsAddDialogOpen(false)
        setFormData({ name: "", clientType: "B2B", classification: "C", hourlyRate: "100", notes: "" })
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(errorData.error || "Er is iets misgegaan bij het toevoegen van de klant")
      }
    } catch (error) {
      console.error("Failed to add client:", error)
      alert("Er is een fout opgetreden. Controleer je verbinding en probeer opnieuw.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClient = async () => {
    if (!selectedClient) return

    if (!formData.name.trim()) {
      alert("Vul een klantnaam in")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          clientType: formData.clientType,
          classification: formData.classification,
          hourlyRate: parseFloat(formData.hourlyRate) || 100,
          notes: formData.notes.trim() || null,
        }),
      })

      if (res.ok) {
        const updatedClient = await res.json()
        setClients((prev) =>
          prev.map((c) => (c.id === selectedClient.id ? { ...c, ...updatedClient } : c))
        )
        setIsEditDialogOpen(false)
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(errorData.error || "Er is iets misgegaan bij het bewerken van de klant")
      }
    } catch (error) {
      console.error("Failed to update client:", error)
      alert("Er is een fout opgetreden. Controleer je verbinding en probeer opnieuw.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchive = async (clientId: string) => {
    if (!confirm("Weet je zeker dat je deze klant wilt archiveren?")) return

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setClients((prev) =>
          prev.map((c) => (c.id === clientId ? { ...c, isActive: false } : c))
        )
      }
    } catch (error) {
      console.error("Failed to archive client:", error)
    }
  }

  const handleAddBudget = async () => {
    if (!selectedClient) return

    if (!budgetForm.totalBudget || parseFloat(budgetForm.totalBudget) <= 0) {
      alert("Vul een geldig budget in")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
          totalBudget: parseFloat(budgetForm.totalBudget),
          budgetType: budgetForm.budgetType,
          hourlyRate: budgetForm.hourlyRate ? parseFloat(budgetForm.hourlyRate) : null,
          prospectProbability: budgetForm.budgetType === "PROSPECT"
            ? parseFloat(budgetForm.prospectProbability)
            : null,
        }),
      })

      if (res.ok) {
        const newBudget = await res.json()
        setClients((prev) =>
          prev.map((c) =>
            c.id === selectedClient.id
              ? { ...c, budgets: [...c.budgets, newBudget] }
              : c
          )
        )
        setIsBudgetDialogOpen(false)
        setBudgetForm({ totalBudget: "", budgetType: "SUBSCRIPTION", prospectProbability: "0.5", hourlyRate: "" })
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(errorData.error || "Er is iets misgegaan bij het toevoegen van het budget")
      }
    } catch (error) {
      console.error("Failed to add budget:", error)
      alert("Er is een fout opgetreden. Controleer je verbinding en probeer opnieuw.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (client: Client) => {
    setSelectedClient(client)
    setFormData({
      name: client.name,
      clientType: client.clientType,
      classification: client.classification,
      hourlyRate: client.hourlyRate.toString(),
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
      hourlyRate: client.hourlyRate.toString(),
    })
    setIsBudgetDialogOpen(true)
  }

  const toggleClientExpanded = (clientId: string) => {
    setExpandedClients((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
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

  const getCurrentMonthBudgets = (client: Client) => {
    return client.budgets.filter((b) => b.year === selectedYear && b.month === selectedMonth)
  }

  const getCurrentMonthBudgetTotal = (client: Client) => {
    return getCurrentMonthBudgets(client).reduce((sum, b) => sum + b.totalBudget, 0)
  }

  const getBudgetsByType = (client: Client) => {
    const budgets = getCurrentMonthBudgets(client)
    const grouped: Record<string, { budgets: Budget[]; total: number }> = {}

    budgets.forEach((budget) => {
      if (!grouped[budget.budgetType]) {
        grouped[budget.budgetType] = { budgets: [], total: 0 }
      }
      grouped[budget.budgetType].budgets.push(budget)
      grouped[budget.budgetType].total += budget.totalBudget
    })

    return grouped
  }

  const getEffectiveHourlyRate = (budget: Budget, clientDefaultRate: number) => {
    return budget.hourlyRate ?? clientDefaultRate
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
                {formatCurrency(clients.reduce((sum, c) => sum + getCurrentMonthBudgetTotal(c), 0))}
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
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Classificatie</TableHead>
                  <TableHead className="text-right">Standaard tarief</TableHead>
                  <TableHead className="text-right">Budget {getDutchMonth(selectedMonth)}</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Acties</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const isExpanded = expandedClients.has(client.id)
                  const budgetsByType = getBudgetsByType(client)
                  const hasBudgets = Object.keys(budgetsByType).length > 0

                  return (
                    <Collapsible key={client.id} asChild open={isExpanded}>
                      <>
                        <TableRow className={!client.isActive ? "opacity-50" : ""}>
                          <TableCell>
                            {hasBudgets && (
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleClientExpanded(client.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </TableCell>
                          <TableCell>
                            <div
                              className={`font-medium ${hasBudgets ? "cursor-pointer hover:text-blue-600" : ""}`}
                              onClick={() => hasBudgets && toggleClientExpanded(client.id)}
                            >
                              {client.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{client.clientType}</Badge>
                          </TableCell>
                          <TableCell>{getClassificationBadge(client.classification)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(client.hourlyRate)}/uur</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(getCurrentMonthBudgetTotal(client))}
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

                        {/* Expanded Budget Details */}
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={canEdit ? 8 : 7} className="p-0">
                              <div className="p-4 space-y-3">
                                <div className="text-sm font-semibold text-muted-foreground mb-2">
                                  Budget details voor {getDutchMonth(selectedMonth)} {selectedYear}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {Object.entries(budgetsByType).map(([type, data]) => (
                                    <div
                                      key={type}
                                      className="bg-background border rounded-lg p-4 space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <Badge variant={BUDGET_TYPE_COLORS[type] || "secondary"}>
                                          {BUDGET_TYPE_LABELS[type] || type}
                                        </Badge>
                                        <span className="font-bold text-lg">
                                          {formatCurrency(data.total)}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        {data.budgets.map((budget) => {
                                          const effectiveRate = getEffectiveHourlyRate(budget, client.hourlyRate)
                                          const estimatedHours = budget.totalBudget / effectiveRate

                                          return (
                                            <div
                                              key={budget.id}
                                              className="text-sm text-muted-foreground border-t pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0"
                                            >
                                              <div className="flex justify-between">
                                                <span>Bedrag:</span>
                                                <span className="font-medium">{formatCurrency(budget.totalBudget)}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Uurtarief:</span>
                                                <span className="font-medium">
                                                  {formatCurrency(effectiveRate)}/uur
                                                  {budget.hourlyRate && budget.hourlyRate !== client.hourlyRate && (
                                                    <span className="text-xs text-orange-600 ml-1">(afwijkend)</span>
                                                  )}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Geschatte uren:</span>
                                                <span className="font-medium">{estimatedHours.toFixed(1)} uur</span>
                                              </div>
                                              {budget.budgetType === "PROSPECT" && budget.prospectProbability && (
                                                <div className="flex justify-between">
                                                  <span>Kans:</span>
                                                  <span className="font-medium">
                                                    {(budget.prospectProbability * 100).toFixed(0)}%
                                                  </span>
                                                </div>
                                              )}
                                              {budget.budgetType === "PROSPECT" && budget.prospectProbability && (
                                                <div className="flex justify-between text-green-600">
                                                  <span>Gewogen waarde:</span>
                                                  <span className="font-medium">
                                                    {formatCurrency(budget.totalBudget * budget.prospectProbability)}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Summary row */}
                                <div className="border-t pt-3 mt-3">
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Totaal budget: </span>
                                      <span className="font-bold">{formatCurrency(getCurrentMonthBudgetTotal(client))}</span>
                                    </div>
                                    {budgetsByType.SUBSCRIPTION && (
                                      <div>
                                        <span className="text-muted-foreground">Abonnementen: </span>
                                        <span className="font-medium text-green-600">
                                          {formatCurrency(budgetsByType.SUBSCRIPTION.total)}
                                        </span>
                                      </div>
                                    )}
                                    {budgetsByType.PROJECT && (
                                      <div>
                                        <span className="text-muted-foreground">Projecten: </span>
                                        <span className="font-medium text-blue-600">
                                          {formatCurrency(budgetsByType.PROJECT.total)}
                                        </span>
                                      </div>
                                    )}
                                    {budgetsByType.PROSPECT && (
                                      <div>
                                        <span className="text-muted-foreground">Prospects: </span>
                                        <span className="font-medium text-orange-600">
                                          {formatCurrency(budgetsByType.PROSPECT.total)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  )
                })}
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
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Klantnaam"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.clientType}
                  onValueChange={(value) => setFormData({ ...formData, clientType: value })}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
            <div className="space-y-2">
              <Label htmlFor="rate">Standaard uurtarief (€)</Label>
              <Input
                id="rate"
                type="number"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optionele notities..."
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
              Annuleren
            </Button>
            <Button onClick={handleAddClient} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "Bezig..." : "Toevoegen"}
            </Button>
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
              <Label htmlFor="edit-name">Naam *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.clientType}
                  onValueChange={(value) => setFormData({ ...formData, clientType: value })}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
            <div className="space-y-2">
              <Label htmlFor="edit-rate">Standaard uurtarief (€)</Label>
              <Input
                id="edit-rate"
                type="number"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notities</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optionele notities..."
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Annuleren
            </Button>
            <Button onClick={handleEditClient} disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "Bezig..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Budget Dialog */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Budget toevoegen - {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Budget voor {getDutchMonth(selectedMonth)} {selectedYear}
            </p>
            <div className="space-y-2">
              <Label>Budget type</Label>
              <Select
                value={budgetForm.budgetType}
                onValueChange={(value) => setBudgetForm({ ...budgetForm, budgetType: value })}
                disabled={isSubmitting}
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
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (€) *</Label>
              <Input
                id="budget"
                type="number"
                value={budgetForm.totalBudget}
                onChange={(e) => setBudgetForm({ ...budgetForm, totalBudget: e.target.value })}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-rate">
                Uurtarief voor dit budget (€)
                <span className="text-xs text-muted-foreground ml-2">
                  (leeg = standaard tarief van {formatCurrency(selectedClient?.hourlyRate || 100)})
                </span>
              </Label>
              <Input
                id="budget-rate"
                type="number"
                value={budgetForm.hourlyRate}
                onChange={(e) => setBudgetForm({ ...budgetForm, hourlyRate: e.target.value })}
                placeholder={`Standaard: ${selectedClient?.hourlyRate || 100}`}
                disabled={isSubmitting}
              />
            </div>
            {budgetForm.budgetType === "PROSPECT" && (
              <div className="space-y-2">
                <Label htmlFor="probability">Kans (0.0 - 1.0)</Label>
                <Input
                  id="probability"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={budgetForm.prospectProbability}
                  onChange={(e) => setBudgetForm({ ...budgetForm, prospectProbability: e.target.value })}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Gewogen waarde: {formatCurrency(
                    (parseFloat(budgetForm.totalBudget) || 0) * (parseFloat(budgetForm.prospectProbability) || 0)
                  )}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)} disabled={isSubmitting}>
              Annuleren
            </Button>
            <Button
              onClick={handleAddBudget}
              disabled={isSubmitting || !budgetForm.totalBudget || parseFloat(budgetForm.totalBudget) <= 0}
            >
              {isSubmitting ? "Bezig..." : "Toevoegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
