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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Plus, Trash2, AlertCircle, AlertTriangle } from "lucide-react"
import { formatCurrency, getDutchMonth, INTERNAL_HOURLY_RATE } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

type ViewMode = "month" | "year"

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
    subscriptionAmount?: number
    subscriptionStartDate?: string
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

interface YearlyForecastData {
  year: number
  months: {
    month: number
    clients: ClientForecast[]
    summary: {
      totalBudget: number
      totalAllocated: number
      totalProspect: number
      totalSubscription: number
      clientCount: number
    }
  }[]
  yearlySummary: {
    totalBudget: number
    totalAllocated: number
    totalUnallocated: number
    totalProspect: number
    totalSubscription: number
  }
}

interface Employee {
  id: string
  name: string
}

interface UnallocatedBudget {
  clientId: string
  clientName: string
  budgetId: string
  budgetType: string
  month: number
  unallocatedAmount: number
}

const DUTCH_MONTHS_SHORT = [
  "Jan", "Feb", "Mrt", "Apr", "Mei", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"
]

export default function ForecastPage() {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [data, setData] = useState<ForecastData | null>(null)
  const [yearlyData, setYearlyData] = useState<YearlyForecastData | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<ClientBudget | null>(null)
  const [selectedClientName, setSelectedClientName] = useState("")
  const [unallocatedBudgets, setUnallocatedBudgets] = useState<UnallocatedBudget[]>([])

  // Form state
  const [newEntry, setNewEntry] = useState({
    employeeId: "",
    taskDescription: "",
    budgetAmount: "",
  })

  const fetchMonthlyData = async () => {
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
    }
  }

  const fetchYearlyData = async () => {
    try {
      const [yearlyRes, employeesRes, clientsRes] = await Promise.all([
        fetch(`/api/forecast/yearly?year=${selectedYear}`),
        fetch("/api/employees"),
        fetch("/api/clients"),
      ])

      if (yearlyRes.ok) {
        const yearlyForecastData = await yearlyRes.json()

        // Process subscription data from clients
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json()

          // Enrich yearly data with subscription calculations
          const enrichedData = enrichWithSubscriptions(yearlyForecastData, clientsData)
          setYearlyData(enrichedData)

          // Calculate unallocated budgets
          const unallocated = calculateUnallocatedBudgets(enrichedData)
          setUnallocatedBudgets(unallocated)
        } else {
          setYearlyData(yearlyForecastData)
        }
      }

      if (employeesRes.ok) {
        const employeesData = await employeesRes.json()
        setEmployees(employeesData)
      }
    } catch (error) {
      console.error("Failed to fetch yearly data:", error)
    }
  }

  const enrichWithSubscriptions = (yearlyData: YearlyForecastData, clients: any[]): YearlyForecastData => {
    const enrichedMonths = yearlyData.months.map((monthData) => {
      let totalSubscription = 0
      let totalProspect = 0

      const enrichedClients = monthData.clients.map((clientForecast) => {
        const clientInfo = clients.find((c: any) => c.id === clientForecast.client.id)

        if (clientInfo?.subscriptionAmount && clientInfo?.subscriptionStartDate) {
          const startDate = new Date(clientInfo.subscriptionStartDate)
          const startMonth = startDate.getMonth() + 1
          const startYear = startDate.getFullYear()

          // Check if subscription is active for this month
          if (startYear < yearlyData.year ||
              (startYear === yearlyData.year && startMonth <= monthData.month)) {
            totalSubscription += clientInfo.subscriptionAmount
          }
        }

        // Calculate prospect revenue
        clientForecast.budgets.forEach((budget) => {
          if (budget.budgetType === "PROSPECT" && budget.prospectProbability) {
            totalProspect += budget.totalBudget * budget.prospectProbability
          }
        })

        return {
          ...clientForecast,
          client: {
            ...clientForecast.client,
            subscriptionAmount: clientInfo?.subscriptionAmount,
            subscriptionStartDate: clientInfo?.subscriptionStartDate,
          },
        }
      })

      return {
        ...monthData,
        clients: enrichedClients,
        summary: {
          ...monthData.summary,
          totalSubscription,
          totalProspect,
        },
      }
    })

    const yearlySummary = enrichedMonths.reduce(
      (acc, month) => ({
        totalBudget: acc.totalBudget + month.summary.totalBudget,
        totalAllocated: acc.totalAllocated + month.summary.totalAllocated,
        totalUnallocated: acc.totalUnallocated + (month.summary.totalBudget - month.summary.totalAllocated),
        totalProspect: acc.totalProspect + month.summary.totalProspect,
        totalSubscription: acc.totalSubscription + month.summary.totalSubscription,
      }),
      { totalBudget: 0, totalAllocated: 0, totalUnallocated: 0, totalProspect: 0, totalSubscription: 0 }
    )

    return {
      ...yearlyData,
      months: enrichedMonths,
      yearlySummary,
    }
  }

  const calculateUnallocatedBudgets = (yearlyData: YearlyForecastData): UnallocatedBudget[] => {
    const unallocated: UnallocatedBudget[] = []

    yearlyData.months.forEach((monthData) => {
      monthData.clients.forEach((clientForecast) => {
        clientForecast.budgets.forEach((budget) => {
          if (budget.unallocatedAmount > 100) {
            unallocated.push({
              clientId: clientForecast.client.id,
              clientName: clientForecast.client.name,
              budgetId: budget.id,
              budgetType: budget.budgetType,
              month: budget.month,
              unallocatedAmount: budget.unallocatedAmount,
            })
          }
        })
      })
    })

    return unallocated.sort((a, b) => b.unallocatedAmount - a.unallocatedAmount)
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      if (viewMode === "year") {
        await fetchYearlyData()
      } else {
        await fetchMonthlyData()
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedYear, viewMode])

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

  const getChartData = () => {
    if (!yearlyData) return []

    return yearlyData.months.map((monthData) => ({
      name: DUTCH_MONTHS_SHORT[monthData.month - 1],
      month: monthData.month,
      omzet: monthData.summary.totalBudget - monthData.summary.totalProspect,
      prospect: monthData.summary.totalProspect,
      abonnement: monthData.summary.totalSubscription,
    }))
  }

  const getTotalUnallocated = () => {
    return unallocatedBudgets.reduce((sum, item) => sum + item.unallocatedAmount, 0)
  }

  const renderUnallocatedAlert = () => {
    if (unallocatedBudgets.length === 0) return null

    const totalUnallocated = getTotalUnallocated()

    return (
      <div className="mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 cursor-pointer hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <div className="font-medium text-amber-800">
                    Onverdeeld budget: {formatCurrency(totalUnallocated)}
                  </div>
                  <div className="text-sm text-amber-600">
                    {unallocatedBudgets.length} budget{unallocatedBudgets.length !== 1 ? "ten" : ""} nog niet volledig toegewezen. Klik voor details.
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-96 max-h-80 overflow-y-auto">
            {unallocatedBudgets.map((item, index) => (
              <DropdownMenuItem
                key={`${item.budgetId}-${index}`}
                className="flex justify-between items-center py-3"
                onClick={() => {
                  setSelectedMonth(item.month)
                  setViewMode("month")
                  const clientSet = new Set([item.clientId])
                  setExpandedClients(clientSet)
                }}
              >
                <div>
                  <div className="font-medium">{item.clientName}</div>
                  <div className="text-sm text-muted-foreground">
                    {getDutchMonth(item.month)} - {getBudgetTypeLabel(item.budgetType)}
                  </div>
                </div>
                <Badge variant="danger">{formatCurrency(item.unallocatedAmount)}</Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const getBudgetTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      SUBSCRIPTION: "Abonnement",
      PROJECT: "Project",
      PROSPECT: "Prospect",
      TOOLING: "Tooling",
      NACALCULATIE: "Nacalculatie",
      INHUUR: "Inhuur",
    }
    return labels[type] || type
  }

  const renderYearlyChart = () => {
    const chartData = getChartData()

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Omzet overzicht {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Maand: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="omzet"
                  name="Vaste omzet"
                  stroke="#1a365d"
                  strokeWidth={2}
                  dot={{ fill: "#1a365d" }}
                />
                <Line
                  type="monotone"
                  dataKey="prospect"
                  name="Prospect omzet"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#f59e0b" }}
                />
                <Line
                  type="monotone"
                  dataKey="abonnement"
                  name="Abonnementen"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderYearlySummary = () => {
    if (!yearlyData) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(yearlyData.yearlySummary.totalBudget)}</div>
            <p className="text-sm text-muted-foreground">Totaal budget jaar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(yearlyData.yearlySummary.totalSubscription)}
            </div>
            <p className="text-sm text-muted-foreground">Abonnementen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(yearlyData.yearlySummary.totalProspect)}
            </div>
            <p className="text-sm text-muted-foreground">Prospect (gewogen)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(yearlyData.yearlySummary.totalAllocated)}</div>
            <p className="text-sm text-muted-foreground">Toegewezen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={cn(
              "text-2xl font-bold",
              yearlyData.yearlySummary.totalUnallocated > 0 ? "text-red-600" : "text-green-600"
            )}>
              {formatCurrency(yearlyData.yearlySummary.totalUnallocated)}
            </div>
            <p className="text-sm text-muted-foreground">Onverdeeld</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderYearlyClientTable = () => {
    if (!yearlyData) return null

    // Aggregate client data across all months
    const clientYearlyData = new Map<string, {
      client: ClientForecast["client"]
      monthlyBudgets: number[]
      totalBudget: number
      totalAllocated: number
    }>()

    yearlyData.months.forEach((monthData) => {
      monthData.clients.forEach((clientForecast) => {
        const existing = clientYearlyData.get(clientForecast.client.id)
        if (existing) {
          existing.monthlyBudgets[monthData.month - 1] = clientForecast.totalBudget
          existing.totalBudget += clientForecast.totalBudget
          existing.totalAllocated += clientForecast.totalAllocated
        } else {
          const monthlyBudgets = new Array(12).fill(0)
          monthlyBudgets[monthData.month - 1] = clientForecast.totalBudget
          clientYearlyData.set(clientForecast.client.id, {
            client: clientForecast.client,
            monthlyBudgets,
            totalBudget: clientForecast.totalBudget,
            totalAllocated: clientForecast.totalAllocated,
          })
        }
      })
    })

    const sortedClients = Array.from(clientYearlyData.values()).sort(
      (a, b) => b.totalBudget - a.totalBudget
    )

    return (
      <Card>
        <CardHeader>
          <CardTitle>Klanten jaaroverzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Klant</th>
                  {DUTCH_MONTHS_SHORT.map((month) => (
                    <th key={month} className="text-right py-2 px-2 font-medium w-20">
                      {month}
                    </th>
                  ))}
                  <th className="text-right py-2 px-2 font-medium w-24">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((clientData) => (
                  <tr
                    key={clientData.client.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setViewMode("month")
                      const clientSet = new Set([clientData.client.id])
                      setExpandedClients(clientSet)
                    }}
                  >
                    <td className="py-2 px-2">
                      <div className="font-medium">{clientData.client.name}</div>
                      {clientData.client.subscriptionAmount && (
                        <div className="text-xs text-green-600">
                          Abo: {formatCurrency(clientData.client.subscriptionAmount)}/mnd
                        </div>
                      )}
                    </td>
                    {clientData.monthlyBudgets.map((budget, index) => (
                      <td
                        key={index}
                        className={cn(
                          "text-right py-2 px-2",
                          budget > 0 ? "text-gray-900" : "text-gray-300"
                        )}
                      >
                        {budget > 0 ? formatCurrency(budget) : "-"}
                      </td>
                    ))}
                    <td className="text-right py-2 px-2 font-medium">
                      {formatCurrency(clientData.totalBudget)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-medium">
                  <td className="py-2 px-2">Totaal</td>
                  {yearlyData.months.map((monthData) => (
                    <td key={monthData.month} className="text-right py-2 px-2">
                      {formatCurrency(monthData.summary.totalBudget)}
                    </td>
                  ))}
                  <td className="text-right py-2 px-2">
                    {formatCurrency(yearlyData.yearlySummary.totalBudget)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || (viewMode === "month" && !data) || (viewMode === "year" && !yearlyData)) {
    return (
      <div className="p-6">
        <Header
          title="Forecast"
          subtitle={viewMode === "year"
            ? `Jaaroverzicht ${selectedYear}`
            : `Planning voor ${getDutchMonth(selectedMonth)} ${selectedYear}`
          }
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
        subtitle={viewMode === "year"
          ? `Jaaroverzicht ${selectedYear}`
          : `Planning voor ${getDutchMonth(selectedMonth)} ${selectedYear}`
        }
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      <div className="p-6 space-y-6">
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            onClick={() => setViewMode("month")}
          >
            Maandoverzicht
          </Button>
          <Button
            variant={viewMode === "year" ? "default" : "outline"}
            onClick={() => setViewMode("year")}
          >
            Jaaroverzicht
          </Button>
        </div>

        {viewMode === "year" ? (
          <>
            {/* Unallocated Budget Alert */}
            {renderUnallocatedAlert()}

            {/* Yearly Chart */}
            {renderYearlyChart()}

            {/* Yearly Summary */}
            {renderYearlySummary()}

            {/* Yearly Client Table */}
            {renderYearlyClientTable()}
          </>
        ) : (
          <>
            {/* Unallocated Budget Alert for Month View */}
            {data && (() => {
              const monthlyUnallocated = data.clients.flatMap((client) =>
                client.budgets
                  .filter((budget) => budget.unallocatedAmount > 100)
                  .map((budget) => ({
                    clientId: client.client.id,
                    clientName: client.client.name,
                    budgetId: budget.id,
                    budgetType: budget.budgetType,
                    month: budget.month,
                    unallocatedAmount: budget.unallocatedAmount,
                  }))
              )

              if (monthlyUnallocated.length === 0) return null

              const totalUnallocated = monthlyUnallocated.reduce(
                (sum, item) => sum + item.unallocatedAmount,
                0
              )

              return (
                <div className="mb-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 cursor-pointer hover:bg-amber-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                          <div className="flex-1">
                            <div className="font-medium text-amber-800">
                              Onverdeeld budget deze maand: {formatCurrency(totalUnallocated)}
                            </div>
                            <div className="text-sm text-amber-600">
                              {monthlyUnallocated.length} budget{monthlyUnallocated.length !== 1 ? "ten" : ""} nog niet volledig toegewezen. Klik voor details.
                            </div>
                          </div>
                          <ChevronDown className="h-5 w-5 text-amber-600" />
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-96 max-h-80 overflow-y-auto">
                      {monthlyUnallocated.map((item, index) => (
                        <DropdownMenuItem
                          key={`${item.budgetId}-${index}`}
                          className="flex justify-between items-center py-3"
                          onClick={() => {
                            const clientSet = new Set([item.clientId])
                            setExpandedClients(clientSet)
                          }}
                        >
                          <div>
                            <div className="font-medium">{item.clientName}</div>
                            <div className="text-sm text-muted-foreground">
                              {getBudgetTypeLabel(item.budgetType)}
                            </div>
                          </div>
                          <Badge variant="danger">{formatCurrency(item.unallocatedAmount)}</Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })()}

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{data!.summary.clientCount}</div>
                  <p className="text-sm text-muted-foreground">Klanten</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(data!.summary.totalBudget)}</div>
                  <p className="text-sm text-muted-foreground">Totaal budget</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(data!.summary.totalAllocated)}</div>
                  <p className="text-sm text-muted-foreground">
                    Toegewezen ({((data!.summary.totalAllocated / data!.summary.totalBudget) * 100 || 0).toFixed(0)}%)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Client List */}
            <div className="space-y-4">
              {data!.clients.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    Geen klanten met budget voor deze maand
                  </CardContent>
                </Card>
              ) : (
                data!.clients.map((clientForecast) => (
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
          </>
        )}
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
