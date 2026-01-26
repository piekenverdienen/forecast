"use client"

import { useEffect, useState } from "react"
import { useMonth } from "@/components/layout/month-context"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, Plus, Trash2, AlertCircle } from "lucide-react"
import { formatCurrency, getDutchMonth, INTERNAL_HOURLY_RATE } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ForecastEntry {
  id: string
  employeeId: string
  taskDescription: string
  budgetAmount: number
  employee: {
    id: string
    name: string
  }
}

interface ClientBudget {
  id: string
  year: number
  month: number
  totalBudget: number
  budgetType: string
  prospectProbability: number | null
  forecastEntries: ForecastEntry[]
  allocatedAmount: number
  unallocatedAmount: number
}

interface ClientForecast {
  client: {
    id: string
    name: string
    hourlyRate: number
  }
  budgets: ClientBudget[]
  totalBudget: number
  totalAllocated: number
}

interface ForecastData {
  year: number
  month: number
  clients: ClientForecast[]
  summary: {
    totalBudget: number
    totalAllocated: number
    clientCount: number
  }
}

interface Employee {
  id: string
  name: string
}

export default function ForecastPage() {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [data, setData] = useState<ForecastData | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<ClientBudget | null>(null)
  const [selectedClientName, setSelectedClientName] = useState("")

  // Form state
  const [newEntry, setNewEntry] = useState({
    employeeId: "",
    taskDescription: "",
    budgetAmount: "",
  })

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [forecastRes, employeesRes] = await Promise.all([
        fetch(`/api/forecast?year=${selectedYear}&month=${selectedMonth}`),
        fetch("/api/employees"),
      ])

      if (forecastRes.ok) {
        const forecastData = await forecastRes.json()
        setData(forecastData)
      }

      if (employeesRes.ok) {
        const employeesData = await employeesRes.json()
        setEmployees(employeesData)
      }
    } catch (error) {
      console.error("Failed to fetch forecast data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedYear])

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients)
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId)
    } else {
      newExpanded.add(clientId)
    }
    setExpandedClients(newExpanded)
  }

  const openAddDialog = (budget: ClientBudget, clientName: string) => {
    setSelectedBudget(budget)
    setSelectedClientName(clientName)
    setNewEntry({ employeeId: "", taskDescription: "", budgetAmount: "" })
    setIsAddDialogOpen(true)
  }

  const handleAddEntry = async () => {
    if (!selectedBudget || !newEntry.employeeId || !newEntry.taskDescription || !newEntry.budgetAmount) {
      return
    }

    try {
      const res = await fetch("/api/forecast/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientBudgetId: selectedBudget.id,
          employeeId: newEntry.employeeId,
          taskDescription: newEntry.taskDescription,
          budgetAmount: parseFloat(newEntry.budgetAmount),
        }),
      })

      if (res.ok) {
        setIsAddDialogOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error("Failed to add entry:", error)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Weet je zeker dat je deze toewijzing wilt verwijderen?")) {
      return
    }

    try {
      const res = await fetch(`/api/forecast/entries/${entryId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Failed to delete entry:", error)
    }
  }

  const getBudgetTypeBadge = (type: string, probability?: number | null) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "danger"> = {
      SUBSCRIPTION: "success",
      PROJECT: "default",
      PROSPECT: "warning",
      TOOLING: "secondary",
      NACALCULATIE: "outline",
      INHUUR: "secondary",
    }

    const labels: Record<string, string> = {
      SUBSCRIPTION: "Abonnement",
      PROJECT: "Project",
      PROSPECT: `Prospect${probability ? ` (${(probability * 100).toFixed(0)}%)` : ""}`,
      TOOLING: "Tooling",
      NACALCULATIE: "Nacalculatie",
      INHUUR: "Inhuur",
    }

    return <Badge variant={variants[type] || "default"}>{labels[type] || type}</Badge>
  }

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <Header
          title="Forecast"
          subtitle={`Planning voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
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
        title="Forecast"
        subtitle={`Planning voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{data.summary.clientCount}</div>
              <p className="text-sm text-muted-foreground">Klanten</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalBudget)}</div>
              <p className="text-sm text-muted-foreground">Totaal budget</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalAllocated)}</div>
              <p className="text-sm text-muted-foreground">
                Toegewezen ({((data.summary.totalAllocated / data.summary.totalBudget) * 100 || 0).toFixed(0)}%)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client List */}
        <div className="space-y-4">
          {data.clients.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Geen klanten met budget voor deze maand
              </CardContent>
            </Card>
          ) : (
            data.clients.map((clientForecast) => (
              <Collapsible
                key={clientForecast.client.id}
                open={expandedClients.has(clientForecast.client.id)}
                onOpenChange={() => toggleClient(clientForecast.client.id)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronDown
                            className={cn(
                              "h-5 w-5 transition-transform",
                              expandedClients.has(clientForecast.client.id) && "transform rotate-180"
                            )}
                          />
                          <div>
                            <CardTitle className="text-lg">{clientForecast.client.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(clientForecast.client.hourlyRate)}/uur
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(clientForecast.totalAllocated)}</div>
                            <div className="text-sm text-muted-foreground">
                              van {formatCurrency(clientForecast.totalBudget)}
                            </div>
                          </div>
                          {clientForecast.totalBudget - clientForecast.totalAllocated > 100 && (
                            <Badge variant="danger" className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Onverdeeld
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {clientForecast.budgets.map((budget) => (
                        <div key={budget.id} className="border rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              {getBudgetTypeBadge(budget.budgetType, budget.prospectProbability)}
                              <span className="font-medium">{formatCurrency(budget.totalBudget)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-green-600">{formatCurrency(budget.allocatedAmount)}</span>
                              {" / "}
                              <span className={budget.unallocatedAmount > 0 ? "text-red-600" : ""}>
                                {formatCurrency(budget.unallocatedAmount)} onverdeeld
                              </span>
                            </div>
                          </div>

                          {/* Forecast Entries */}
                          {budget.forecastEntries.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {budget.forecastEntries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between bg-gray-50 p-3 rounded"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">{entry.taskDescription}</div>
                                    <div className="text-sm text-gray-500">{entry.employee.name}</div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="font-medium">{formatCurrency(entry.budgetAmount)}</div>
                                      <div className="text-sm text-gray-500">
                                        {(entry.budgetAmount / INTERNAL_HOURLY_RATE).toFixed(1)} uur
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Entry Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddDialog(budget, clientForecast.client.name)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Taak toevoegen
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Taak toevoegen - {selectedClientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Medewerker</Label>
              <Select
                value={newEntry.employeeId}
                onValueChange={(value) => setNewEntry({ ...newEntry, employeeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer medewerker" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task">Taakomschrijving</Label>
              <Input
                id="task"
                value={newEntry.taskDescription}
                onChange={(e) => setNewEntry({ ...newEntry, taskDescription: e.target.value })}
                placeholder="Bijv. SEO optimalisatie"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (€)</Label>
              <Input
                id="budget"
                type="number"
                value={newEntry.budgetAmount}
                onChange={(e) => setNewEntry({ ...newEntry, budgetAmount: e.target.value })}
                placeholder="0.00"
              />
              {newEntry.budgetAmount && (
                <p className="text-sm text-muted-foreground">
                  = {(parseFloat(newEntry.budgetAmount) / INTERNAL_HOURLY_RATE).toFixed(1)} interne uren
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddEntry}>Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
