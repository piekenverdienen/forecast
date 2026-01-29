"use client"

import React, { useEffect, useState } from "react"
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
    clientType?: string
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

// Yearly data structures
interface ClientYearlyBudgetType {
  [budgetType: string]: number[]  // 12 months
}

interface ClientYearlyData {
  clientId: string
  clientName: string
  clientType: string
  hourlyRate: number
  subscriptionAmount?: number
  budgetsByType: ClientYearlyBudgetType
  totals: { [budgetType: string]: number }
  grandTotal: number
}

interface YearlyOverview {
  clients: ClientYearlyData[]
  monthlyTotals: { [budgetType: string]: number[] }
  yearlyTotals: { [budgetType: string]: number }
  grandTotal: number
  unallocatedBudgets: UnallocatedBudget[]
}

const DUTCH_MONTHS_SHORT = [
  "Jan", "Feb", "Mrt", "Apr", "Mei", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"
]

const BUDGET_TYPES = [
  "SUBSCRIPTION",
  "PROJECT",
  "PROSPECT",
  "NACALCULATIE",
  "TOOLING",
  "INHUUR"
]

const BUDGET_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Abonnement",
  PROJECT: "Project",
  PROSPECT: "Prospect",
  TOOLING: "Tooling",
  NACALCULATIE: "Nacalculatie",
  INHUUR: "Inhuur",
}

const BUDGET_TYPE_COLORS: Record<string, string> = {
  SUBSCRIPTION: "bg-green-100 text-green-800",
  PROJECT: "bg-blue-100 text-blue-800",
  PROSPECT: "bg-amber-100 text-amber-800",
  TOOLING: "bg-purple-100 text-purple-800",
  NACALCULATIE: "bg-gray-100 text-gray-800",
  INHUUR: "bg-pink-100 text-pink-800",
}

export default function ForecastPage() {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [data, setData] = useState<ForecastData | null>(null)
  const [yearlyOverview, setYearlyOverview] = useState<YearlyOverview | null>(null)
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
      // Fetch all 12 months in parallel
      const monthPromises = Array.from({ length: 12 }, (_, i) =>
        fetch(`/api/forecast?year=${selectedYear}&month=${i + 1}`)
      )

      const [clientsRes, employeesRes, ...monthResponses] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/employees"),
        ...monthPromises,
      ])

      const monthlyData: ForecastData[] = []
      for (const res of monthResponses) {
        if (res.ok) {
          monthlyData.push(await res.json())
        }
      }

      let clientsData: any[] = []
      if (clientsRes.ok) {
        clientsData = await clientsRes.json()
      }

      if (employeesRes.ok) {
        const employeesData = await employeesRes.json()
        setEmployees(employeesData)
      }

      // Process into yearly overview
      const overview = processYearlyData(monthlyData, clientsData, selectedYear)
      setYearlyOverview(overview)
    } catch (error) {
      console.error("Failed to fetch yearly data:", error)
    }
  }

  const processYearlyData = (
    monthlyData: ForecastData[],
    clientsData: any[],
    year: number
  ): YearlyOverview => {
    const clientMap = new Map<string, ClientYearlyData>()
    const unallocatedBudgets: UnallocatedBudget[] = []

    // Initialize monthly totals
    const monthlyTotals: { [budgetType: string]: number[] } = {}
    BUDGET_TYPES.forEach((type) => {
      monthlyTotals[type] = new Array(12).fill(0)
    })

    // Process each month's data
    monthlyData.forEach((monthData) => {
      const monthIndex = monthData.month - 1

      monthData.clients.forEach((clientForecast) => {
        const clientInfo = clientsData.find((c) => c.id === clientForecast.client.id)

        if (!clientMap.has(clientForecast.client.id)) {
          const budgetsByType: ClientYearlyBudgetType = {}
          BUDGET_TYPES.forEach((type) => {
            budgetsByType[type] = new Array(12).fill(0)
          })

          clientMap.set(clientForecast.client.id, {
            clientId: clientForecast.client.id,
            clientName: clientForecast.client.name,
            clientType: clientInfo?.clientType || "-",
            hourlyRate: clientForecast.client.hourlyRate,
            subscriptionAmount: clientInfo?.subscriptionAmount,
            budgetsByType,
            totals: {},
            grandTotal: 0,
          })
        }

        const clientData = clientMap.get(clientForecast.client.id)!

        // Process budgets
        clientForecast.budgets.forEach((budget) => {
          const budgetType = budget.budgetType
          if (clientData.budgetsByType[budgetType]) {
            clientData.budgetsByType[budgetType][monthIndex] += budget.totalBudget
            monthlyTotals[budgetType][monthIndex] += budget.totalBudget
          }

          // Track unallocated
          if (budget.unallocatedAmount > 100) {
            unallocatedBudgets.push({
              clientId: clientForecast.client.id,
              clientName: clientForecast.client.name,
              budgetId: budget.id,
              budgetType: budget.budgetType,
              month: budget.month,
              unallocatedAmount: budget.unallocatedAmount,
            })
          }
        })

        // Handle subscription propagation for future months
        if (clientInfo?.subscriptionAmount && clientInfo?.subscriptionStartDate) {
          const startDate = new Date(clientInfo.subscriptionStartDate)
          const startMonth = startDate.getMonth()
          const startYear = startDate.getFullYear()

          // If subscription started before or in this year
          if (startYear <= year) {
            const effectiveStartMonth = startYear < year ? 0 : startMonth

            for (let m = effectiveStartMonth; m < 12; m++) {
              // Only add if no budget entry exists for this month
              const existingBudget = clientData.budgetsByType["SUBSCRIPTION"][m]
              if (existingBudget === 0) {
                clientData.budgetsByType["SUBSCRIPTION"][m] = clientInfo.subscriptionAmount
                monthlyTotals["SUBSCRIPTION"][m] += clientInfo.subscriptionAmount
              }
            }
          }
        }
      })
    })

    // Calculate totals per client
    clientMap.forEach((clientData) => {
      BUDGET_TYPES.forEach((type) => {
        clientData.totals[type] = clientData.budgetsByType[type].reduce((a, b) => a + b, 0)
        clientData.grandTotal += clientData.totals[type]
      })
    })

    // Calculate yearly totals
    const yearlyTotals: { [budgetType: string]: number } = {}
    let grandTotal = 0
    BUDGET_TYPES.forEach((type) => {
      yearlyTotals[type] = monthlyTotals[type].reduce((a, b) => a + b, 0)
      grandTotal += yearlyTotals[type]
    })

    // Sort clients by grand total descending
    const sortedClients = Array.from(clientMap.values()).sort(
      (a, b) => b.grandTotal - a.grandTotal
    )

    return {
      clients: sortedClients,
      monthlyTotals,
      yearlyTotals,
      grandTotal,
      unallocatedBudgets: unallocatedBudgets.sort((a, b) => b.unallocatedAmount - a.unallocatedAmount),
    }
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
    if (!yearlyOverview) return []

    return DUTCH_MONTHS_SHORT.map((name, index) => {
      const subscription = yearlyOverview.monthlyTotals["SUBSCRIPTION"]?.[index] || 0
      const project = yearlyOverview.monthlyTotals["PROJECT"]?.[index] || 0
      const prospect = yearlyOverview.monthlyTotals["PROSPECT"]?.[index] || 0
      const other =
        (yearlyOverview.monthlyTotals["NACALCULATIE"]?.[index] || 0) +
        (yearlyOverview.monthlyTotals["TOOLING"]?.[index] || 0) +
        (yearlyOverview.monthlyTotals["INHUUR"]?.[index] || 0)

      return {
        name,
        month: index + 1,
        abonnement: subscription,
        project: project,
        prospect: prospect,
        overig: other,
        totaal: subscription + project + prospect + other,
      }
    })
  }

  const renderUnallocatedAlert = () => {
    if (!yearlyOverview || yearlyOverview.unallocatedBudgets.length === 0) return null

    const totalUnallocated = yearlyOverview.unallocatedBudgets.reduce(
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
                    Onverdeeld budget: {formatCurrency(totalUnallocated)}
                  </div>
                  <div className="text-sm text-amber-600">
                    {yearlyOverview.unallocatedBudgets.length} budget{yearlyOverview.unallocatedBudgets.length !== 1 ? "ten" : ""} nog niet volledig toegewezen. Klik voor details.
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-96 max-h-80 overflow-y-auto">
            {yearlyOverview.unallocatedBudgets.map((item, index) => (
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
                    {getDutchMonth(item.month)} - {BUDGET_TYPE_LABELS[item.budgetType] || item.budgetType}
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
                <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Maand: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="abonnement"
                  name="Abonnement"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981" }}
                />
                <Line
                  type="monotone"
                  dataKey="project"
                  name="Project"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
                <Line
                  type="monotone"
                  dataKey="prospect"
                  name="Prospect"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#f59e0b" }}
                />
                <Line
                  type="monotone"
                  dataKey="totaal"
                  name="Totaal"
                  stroke="#1a365d"
                  strokeWidth={3}
                  dot={{ fill: "#1a365d" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderYearlySummary = () => {
    if (!yearlyOverview) return null

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(yearlyOverview.grandTotal)}</div>
            <p className="text-sm text-muted-foreground">Totaal jaar</p>
          </CardContent>
        </Card>
        {BUDGET_TYPES.map((type) => (
          <Card key={type}>
            <CardContent className="pt-6">
              <div className={cn("text-xl font-bold", {
                "text-green-600": type === "SUBSCRIPTION",
                "text-blue-600": type === "PROJECT",
                "text-amber-600": type === "PROSPECT",
              })}>
                {formatCurrency(yearlyOverview.yearlyTotals[type] || 0)}
              </div>
              <p className="text-sm text-muted-foreground">{BUDGET_TYPE_LABELS[type]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderYearlyClientTable = () => {
    if (!yearlyOverview) return null

    // Get all budget types that have any data
    const activeBudgetTypes = BUDGET_TYPES.filter(
      (type) => yearlyOverview.yearlyTotals[type] > 0
    )

    return (
      <Card>
        <CardHeader>
          <CardTitle>Klanten jaaroverzicht {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold sticky left-0 bg-white">Klant</th>
                  <th className="text-center py-3 px-2 font-semibold w-12">Type</th>
                  {DUTCH_MONTHS_SHORT.map((month) => (
                    <th key={month} className="text-right py-3 px-2 font-semibold min-w-[80px]">
                      {month}
                    </th>
                  ))}
                  <th className="text-right py-3 px-2 font-semibold min-w-[100px] bg-gray-50">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {yearlyOverview.clients.map((clientData, clientIndex) => {
                  // Get budget types with data for this client
                  const clientBudgetTypes = BUDGET_TYPES.filter(
                    (type) => clientData.totals[type] > 0
                  )

                  if (clientBudgetTypes.length === 0) return null

                  return (
                    <React.Fragment key={clientData.clientId}>
                      {/* Client header row */}
                      <tr className={cn(
                        "border-t-2 border-gray-200",
                        clientIndex % 2 === 0 ? "bg-gray-50" : "bg-white"
                      )}>
                        <td
                          className="py-3 px-2 font-semibold sticky left-0"
                          style={{ backgroundColor: clientIndex % 2 === 0 ? "#f9fafb" : "white" }}
                          rowSpan={clientBudgetTypes.length + 1}
                        >
                          <div>{clientData.clientName}</div>
                          {clientData.subscriptionAmount && (
                            <div className="text-xs text-green-600 font-normal">
                              Abo: {formatCurrency(clientData.subscriptionAmount)}/mnd
                            </div>
                          )}
                        </td>
                        <td
                          className="text-center py-3 px-2 font-semibold"
                          rowSpan={clientBudgetTypes.length + 1}
                        >
                          <Badge variant="outline">{clientData.clientType}</Badge>
                        </td>
                        {/* Empty cells for header row with totals */}
                        {DUTCH_MONTHS_SHORT.map((_, monthIndex) => {
                          const monthTotal = BUDGET_TYPES.reduce(
                            (sum, type) => sum + (clientData.budgetsByType[type]?.[monthIndex] || 0),
                            0
                          )
                          return (
                            <td key={monthIndex} className="text-right py-3 px-2 font-semibold text-gray-600">
                              {monthTotal > 0 ? formatCurrency(monthTotal) : "-"}
                            </td>
                          )
                        })}
                        <td className="text-right py-3 px-2 font-bold bg-gray-100">
                          {formatCurrency(clientData.grandTotal)}
                        </td>
                      </tr>
                      {/* Budget type rows */}
                      {clientBudgetTypes.map((budgetType) => (
                        <tr
                          key={`${clientData.clientId}-${budgetType}`}
                          className={cn(
                            "text-sm",
                            clientIndex % 2 === 0 ? "bg-gray-50" : "bg-white"
                          )}
                        >
                          {DUTCH_MONTHS_SHORT.map((_, monthIndex) => {
                            const amount = clientData.budgetsByType[budgetType]?.[monthIndex] || 0
                            return (
                              <td
                                key={monthIndex}
                                className={cn(
                                  "text-right py-1 px-2",
                                  amount > 0 ? "text-gray-700" : "text-gray-300"
                                )}
                              >
                                <span className={cn(
                                  "inline-block px-1 rounded text-xs",
                                  amount > 0 && BUDGET_TYPE_COLORS[budgetType]
                                )}>
                                  {amount > 0 ? formatCurrency(amount) : "-"}
                                </span>
                              </td>
                            )
                          })}
                          <td className={cn(
                            "text-right py-1 px-2 font-medium",
                            BUDGET_TYPE_COLORS[budgetType],
                            "bg-opacity-50"
                          )}>
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs">{BUDGET_TYPE_LABELS[budgetType]}</span>
                              <span>{formatCurrency(clientData.totals[budgetType])}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                {/* Totals per budget type */}
                {activeBudgetTypes.map((budgetType) => (
                  <tr key={budgetType} className="border-t">
                    <td className="py-2 px-2 font-medium sticky left-0 bg-white">
                      <span className={cn("px-2 py-1 rounded text-xs", BUDGET_TYPE_COLORS[budgetType])}>
                        {BUDGET_TYPE_LABELS[budgetType]}
                      </span>
                    </td>
                    <td></td>
                    {DUTCH_MONTHS_SHORT.map((_, monthIndex) => (
                      <td key={monthIndex} className="text-right py-2 px-2 font-medium">
                        {formatCurrency(yearlyOverview.monthlyTotals[budgetType]?.[monthIndex] || 0)}
                      </td>
                    ))}
                    <td className={cn("text-right py-2 px-2 font-bold", BUDGET_TYPE_COLORS[budgetType])}>
                      {formatCurrency(yearlyOverview.yearlyTotals[budgetType] || 0)}
                    </td>
                  </tr>
                ))}
                {/* Grand total row */}
                <tr className="border-t-2 border-gray-400 bg-gray-100">
                  <td className="py-3 px-2 font-bold sticky left-0 bg-gray-100">TOTAAL</td>
                  <td></td>
                  {DUTCH_MONTHS_SHORT.map((_, monthIndex) => {
                    const monthTotal = BUDGET_TYPES.reduce(
                      (sum, type) => sum + (yearlyOverview.monthlyTotals[type]?.[monthIndex] || 0),
                      0
                    )
                    return (
                      <td key={monthIndex} className="text-right py-3 px-2 font-bold">
                        {formatCurrency(monthTotal)}
                      </td>
                    )
                  })}
                  <td className="text-right py-3 px-2 font-bold text-lg">
                    {formatCurrency(yearlyOverview.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
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
                              {BUDGET_TYPE_LABELS[item.budgetType] || item.budgetType}
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
                  <div className="text-2xl font-bold">{data?.summary.clientCount || 0}</div>
                  <p className="text-sm text-muted-foreground">Klanten</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(data?.summary.totalBudget || 0)}</div>
                  <p className="text-sm text-muted-foreground">Totaal budget</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(data?.summary.totalAllocated || 0)}</div>
                  <p className="text-sm text-muted-foreground">
                    Toegewezen ({((data?.summary.totalAllocated || 0) / (data?.summary.totalBudget || 1) * 100).toFixed(0)}%)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Client List */}
            <div className="space-y-4">
              {!data?.clients.length ? (
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
