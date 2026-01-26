"use client"

import { useEffect, useState } from "react"
import { useMonth } from "@/components/layout/month-context"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, Search, Filter } from "lucide-react"
import { formatPercentage, getDutchMonth, getProgressBarColor } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface CapacityEmployee {
  employee: {
    id: string
    name: string
    email: string
  }
  contract: {
    hoursPerWeek: number
    billableTarget: number
  } | null
  capacity: {
    workingDays: number
    maxHours: number
    maxBudget: number
    targetBudget: number
    leaveHours: number
    availableHours: number
  }
  status: {
    occupationRate: number
    plannedHours: number
    maxHours: number
    targetHours: number
    status: string
    overHours: number
  }
  clients: {
    clientId: string
    clientName: string
    hours: number
    tasks: string[]
  }[]
}

interface CapacityData {
  year: number
  month: number
  employees: CapacityEmployee[]
  summary: {
    totalEmployees: number
    totalMaxHours: number
    totalPlannedHours: number
    averageOccupation: number
    alertCount: number
    criticalCount: number
    workingDays: number
  }
}

export default function CapacityPage() {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [data, setData] = useState<CapacityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/capacity?year=${selectedYear}&month=${selectedMonth}`)
        if (res.ok) {
          const capacityData = await res.json()
          setData(capacityData)
        }
      } catch (error) {
        console.error("Failed to fetch capacity data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedMonth, selectedYear])

  const filteredEmployees = data?.employees.filter((emp) => {
    const matchesSearch = emp.employee.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAlert = !showOnlyAlerts || emp.status.status === "alert" || emp.status.status === "critical"
    return matchesSearch && matchesAlert
  }) || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="danger">Kritiek</Badge>
      case "alert":
        return <Badge variant="danger">Alert</Badge>
      case "warning":
        return <Badge variant="warning">Waarschuwing</Badge>
      default:
        return <Badge variant="success">OK</Badge>
    }
  }

  const getRowClass = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-50"
      case "alert":
        return "bg-red-50"
      case "warning":
        return "bg-amber-50"
      default:
        return ""
    }
  }

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <Header
          title="Capaciteit"
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
        title="Capaciteit"
        subtitle={`Overzicht voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        alertCount={data.summary.alertCount}
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{data.summary.totalEmployees}</div>
              <p className="text-sm text-muted-foreground">Medewerkers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{data.summary.workingDays}</div>
              <p className="text-sm text-muted-foreground">Werkdagen</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatPercentage(data.summary.averageOccupation, 0)}</div>
              <p className="text-sm text-muted-foreground">Gem. bezetting</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{data.summary.alertCount}</div>
              <p className="text-sm text-muted-foreground">Waarschuwingen</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Zoek medewerker..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <button
                onClick={() => setShowOnlyAlerts(!showOnlyAlerts)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md border transition-colors",
                  showOnlyAlerts ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200"
                )}
              >
                <Filter className="h-4 w-4" />
                Alleen alerts
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card>
          <CardHeader>
            <CardTitle>Medewerker Capaciteit</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Medewerker</TableHead>
                  <TableHead className="text-right">Max Uren</TableHead>
                  <TableHead className="text-right">Gepland</TableHead>
                  <TableHead className="text-right">Bezetting</TableHead>
                  <TableHead className="w-[200px]">Voortgang</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <Collapsible
                    key={emp.employee.id}
                    open={expandedEmployee === emp.employee.id}
                    onOpenChange={(open) => setExpandedEmployee(open ? emp.employee.id : null)}
                  >
                    <TableRow className={getRowClass(emp.status.status)}>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                expandedEmployee === emp.employee.id && "transform rotate-180"
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{emp.employee.name}</div>
                          <div className="text-sm text-gray-500">{emp.employee.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{emp.status.maxHours.toFixed(1)} uur</TableCell>
                      <TableCell className="text-right">{emp.status.plannedHours.toFixed(1)} uur</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPercentage(emp.status.occupationRate, 0)}
                      </TableCell>
                      <TableCell>
                        <Progress
                          value={Math.min(emp.status.occupationRate * 100, 100)}
                          className="h-2"
                          indicatorClassName={getProgressBarColor(emp.status.occupationRate)}
                        />
                      </TableCell>
                      <TableCell>{getStatusBadge(emp.status.status)}</TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className={getRowClass(emp.status.status)}>
                        <TableCell colSpan={7} className="bg-gray-50 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Details */}
                            <div>
                              <h4 className="font-medium mb-2">Details</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Contract uren:</span>
                                  <span>{emp.contract?.hoursPerWeek || 40} uur/week</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Declarabel target:</span>
                                  <span>{formatPercentage(emp.contract?.billableTarget || 0.8, 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Verlofuren:</span>
                                  <span>{emp.capacity.leaveHours.toFixed(1)} uur</span>
                                </div>
                                {emp.status.overHours > 0 && (
                                  <div className="flex justify-between text-red-600 font-medium">
                                    <span>Over capaciteit:</span>
                                    <span>+{emp.status.overHours.toFixed(1)} uur</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Client breakdown */}
                            <div>
                              <h4 className="font-medium mb-2">Klanten ({emp.clients.length})</h4>
                              {emp.clients.length > 0 ? (
                                <div className="space-y-2">
                                  {emp.clients.map((client) => (
                                    <div key={client.clientId} className="flex justify-between text-sm">
                                      <span className="text-gray-700">{client.clientName}</span>
                                      <span className="font-medium">{client.hours.toFixed(1)} uur</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">Geen klanten toegewezen</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Geen medewerkers gevonden
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
