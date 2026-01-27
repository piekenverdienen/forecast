"use client"

import { useEffect, useState } from "react"
import { useMonth } from "@/components/layout/month-context"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency, formatPercentage, getDutchMonth, getProgressBarColor } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Building2, Users, Calendar, TrendingUp } from "lucide-react"

interface ClientYearlyData {
  client: {
    id: string
    name: string
    classification: string
    paymentTerm: string
  }
  months: {
    month: number
    budget: number
    invoiced: number
    status: string
    budgetTypes: string[]
  }[]
  totalBudget: number
  totalInvoiced: number
}

interface EmployeeYearlyData {
  employee: {
    id: string
    name: string
    email: string
  }
  contract: {
    hoursPerWeek: number
    billableTarget: number
  } | null
  months: {
    month: number
    maxHours: number
    plannedHours: number
    leaveHours: number
    availableHours: number
    occupationRate: number
    status: string
  }[]
  totalMaxHours: number
  totalPlannedHours: number
  totalLeaveHours: number
  averageOccupation: number
}

interface YearlyData {
  year: number
  type: string
  data: ClientYearlyData[] | EmployeeYearlyData[]
  totals: {
    totalBudget?: number
    totalInvoiced?: number
    clientCount?: number
    totalMaxHours?: number
    totalPlannedHours?: number
    totalLeaveHours?: number
    employeeCount?: number
  }
}

const shortMonthNames = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]

export default function YearlyPage() {
  const { selectedYear, setSelectedYear } = useMonth()
  const [viewType, setViewType] = useState<"clients" | "employees">("clients")
  const [data, setData] = useState<YearlyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/yearly?year=${selectedYear}&type=${viewType}`)
        if (res.ok) {
          const yearlyData = await res.json()
          setData(yearlyData)
        }
      } catch (error) {
        console.error("Failed to fetch yearly data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedYear, viewType])

  const getCellColor = (value: number, max: number, type: "budget" | "occupation") => {
    if (value === 0) return "bg-gray-50"

    if (type === "budget") {
      return "bg-blue-100"
    }

    const rate = value / max
    if (rate > 0.9) return "bg-red-200"
    if (rate > 0.8) return "bg-amber-200"
    if (rate > 0.7) return "bg-yellow-100"
    return "bg-green-100"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-200 text-green-800"
      case "INVOICED":
        return "bg-blue-200 text-blue-800"
      case "PARTIAL":
        return "bg-amber-200 text-amber-800"
      case "critical":
        return "bg-red-200"
      case "alert":
        return "bg-red-100"
      case "warning":
        return "bg-amber-100"
      default:
        return ""
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Header
          title="Jaaroverzicht"
          subtitle={`${selectedYear}`}
          selectedMonth={1}
          selectedYear={selectedYear}
          onMonthChange={() => {}}
          onYearChange={setSelectedYear}
          showMonthSelector={false}
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
        title="Jaaroverzicht"
        subtitle={`${selectedYear}`}
        selectedMonth={1}
        selectedYear={selectedYear}
        onMonthChange={() => {}}
        onYearChange={setSelectedYear}
        showMonthSelector={false}
      />

      <div className="p-6 space-y-6">
        {/* View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-2">
            <Button
              variant={viewType === "clients" ? "default" : "outline"}
              onClick={() => setViewType("clients")}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Klanten
            </Button>
            <Button
              variant={viewType === "employees" ? "default" : "outline"}
              onClick={() => setViewType("employees")}
            >
              <Users className="h-4 w-4 mr-2" />
              Medewerkers
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {viewType === "clients" ? (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{data.totals.clientCount}</div>
                    <p className="text-sm text-muted-foreground">Klanten</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{formatCurrency(data.totals.totalBudget || 0)}</div>
                    <p className="text-sm text-muted-foreground">Totaal Budget</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{formatCurrency(data.totals.totalInvoiced || 0)}</div>
                    <p className="text-sm text-muted-foreground">Gefactureerd</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatPercentage((data.totals.totalInvoiced || 0) / (data.totals.totalBudget || 1), 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Facturatie %</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{data.totals.employeeCount}</div>
                    <p className="text-sm text-muted-foreground">Medewerkers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{(data.totals.totalMaxHours || 0).toFixed(0)}</div>
                    <p className="text-sm text-muted-foreground">Max Uren</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{(data.totals.totalPlannedHours || 0).toFixed(0)}</div>
                    <p className="text-sm text-muted-foreground">Geplande Uren</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{(data.totals.totalLeaveHours || 0).toFixed(0)}</div>
                    <p className="text-sm text-muted-foreground">Verlof Uren</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Yearly Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {viewType === "clients" ? "Klanten Jaaroverzicht" : "Medewerkers Jaaroverzicht"} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium sticky left-0 bg-white min-w-[200px]">
                      {viewType === "clients" ? "Klant" : "Medewerker"}
                    </th>
                    {shortMonthNames.map((month, i) => (
                      <th key={i} className="text-center py-2 px-2 font-medium min-w-[70px]">
                        {month}
                      </th>
                    ))}
                    <th className="text-right py-2 px-3 font-medium min-w-[100px]">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {viewType === "clients"
                    ? (data?.data as ClientYearlyData[])?.map((item) => (
                        <tr
                          key={item.client.id}
                          className={cn(
                            "border-b hover:bg-gray-50 cursor-pointer",
                            selectedItem === item.client.id && "bg-blue-50"
                          )}
                          onClick={() => setSelectedItem(
                            selectedItem === item.client.id ? null : item.client.id
                          )}
                        >
                          <td className="py-2 px-3 sticky left-0 bg-white">
                            <div className="font-medium">{item.client.name}</div>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {item.client.classification}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  item.client.paymentTerm === "PREPAID"
                                    ? "text-blue-600 border-blue-300"
                                    : "text-amber-600 border-amber-300"
                                )}
                              >
                                {item.client.paymentTerm === "PREPAID" ? "Vooraf" : "Achteraf"}
                              </Badge>
                            </div>
                          </td>
                          {item.months.map((month) => (
                            <td
                              key={month.month}
                              className={cn(
                                "py-2 px-2 text-center",
                                month.budget > 0 && getStatusColor(month.status)
                              )}
                            >
                              {month.budget > 0 ? (
                                <div className="text-xs">
                                  {formatCurrency(month.budget).replace("€", "").trim()}
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency(item.totalBudget)}
                          </td>
                        </tr>
                      ))
                    : (data?.data as EmployeeYearlyData[])?.map((item) => (
                        <tr
                          key={item.employee.id}
                          className={cn(
                            "border-b hover:bg-gray-50 cursor-pointer",
                            selectedItem === item.employee.id && "bg-blue-50"
                          )}
                          onClick={() => setSelectedItem(
                            selectedItem === item.employee.id ? null : item.employee.id
                          )}
                        >
                          <td className="py-2 px-3 sticky left-0 bg-white">
                            <div className="font-medium">{item.employee.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.contract
                                ? `${item.contract.hoursPerWeek}u/w - ${formatPercentage(item.contract.billableTarget, 0)} declarabel`
                                : "Geen contract"}
                            </div>
                          </td>
                          {item.months.map((month) => (
                            <td
                              key={month.month}
                              className={cn(
                                "py-2 px-2 text-center",
                                getStatusColor(month.status)
                              )}
                            >
                              <div className="text-xs font-medium">
                                {formatPercentage(month.occupationRate, 0)}
                              </div>
                              {month.leaveHours > 0 && (
                                <div className="text-[10px] text-amber-600">
                                  {month.leaveHours.toFixed(0)}u verlof
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right">
                            <div className="font-medium">
                              {formatPercentage(item.averageOccupation, 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.totalPlannedHours.toFixed(0)}u
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              {viewType === "clients" ? (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-200 rounded"></div>
                    <span>Betaald</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-blue-200 rounded"></div>
                    <span>Gefactureerd</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-amber-200 rounded"></div>
                    <span>Deels gefactureerd</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-gray-100 rounded"></div>
                    <span>Openstaand</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-100 rounded"></div>
                    <span>{"<70%"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-yellow-100 rounded"></div>
                    <span>70-80%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-amber-200 rounded"></div>
                    <span>80-90%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-200 rounded"></div>
                    <span>{">90%"}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Item Detail (if any) */}
        {selectedItem && viewType === "employees" && (
          <Card>
            <CardHeader>
              <CardTitle>Detail: {
                (data?.data as EmployeeYearlyData[])?.find(e => e.employee.id === selectedItem)?.employee.name
              }</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-2">
                {(data?.data as EmployeeYearlyData[])
                  ?.find(e => e.employee.id === selectedItem)
                  ?.months.map((month) => (
                    <div key={month.month} className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-medium text-sm">{shortMonthNames[month.month - 1]}</div>
                      <div className="text-xs text-gray-500 mt-1">Max: {month.maxHours.toFixed(0)}u</div>
                      <div className="text-xs text-gray-500">Gepland: {month.plannedHours.toFixed(0)}u</div>
                      {month.leaveHours > 0 && (
                        <div className="text-xs text-amber-600">Verlof: {month.leaveHours.toFixed(0)}u</div>
                      )}
                      <Progress
                        value={Math.min(month.occupationRate * 100, 100)}
                        className="h-1.5 mt-2"
                        indicatorClassName={getProgressBarColor(month.occupationRate)}
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
