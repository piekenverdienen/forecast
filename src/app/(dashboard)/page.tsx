"use client"

import { useEffect, useState } from "react"
import { useMonth } from "@/components/layout/month-context"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Target,
  DollarSign,
  Clock,
  AlertCircle
} from "lucide-react"
import { formatCurrency, formatPercentage, getDutchMonth } from "@/lib/utils"
import Link from "next/link"

interface DashboardData {
  year: number
  month: number
  sales: {
    target: number
    grossForecast: number
    netForecast: number
    weightedProspects: number
    totalNetForecast: number
    difference: number
    differencePercentage: number
    clientsNeeded: number
    avgClientValue: number
  }
  capacity: {
    totalMaxHours: number
    totalPlannedHours: number
    averageOccupation: number
    alertCount: number
    criticalCount: number
    employeeCount: number
    workingDays: number
  }
}

interface AlertData {
  id: string
  type: string
  severity: string
  title: string
  description: string
  link?: string
}

export default function DashboardPage() {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [dashboardRes, alertsRes] = await Promise.all([
          fetch(`/api/dashboard?year=${selectedYear}&month=${selectedMonth}`),
          fetch(`/api/dashboard/alerts?year=${selectedYear}&month=${selectedMonth}`)
        ])

        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json()
          setData(dashboardData)
        }

        if (alertsRes.ok) {
          const alertsData = await alertsRes.json()
          setAlerts(alertsData.alerts || [])
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedMonth, selectedYear])

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <Header
          title="Dashboard"
          subtitle={`Overzicht voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          alertCount={0}
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a365d]"></div>
        </div>
      </div>
    )
  }

  const salesProgress = data.sales.target > 0
    ? (data.sales.totalNetForecast / data.sales.target) * 100
    : 0

  const capacityProgress = data.capacity.averageOccupation * 100

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Overzicht voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        alertCount={alerts.length}
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sales Target */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Target</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.sales.target)}</div>
              <Progress value={Math.min(salesProgress, 100)} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {formatPercentage(salesProgress / 100, 0)} gerealiseerd
              </p>
            </CardContent>
          </Card>

          {/* Net Forecast */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Netto Forecast</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.sales.totalNetForecast)}</div>
              <div className={`flex items-center text-sm ${data.sales.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.sales.difference >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {formatCurrency(Math.abs(data.sales.difference))} ({formatPercentage(Math.abs(data.sales.differencePercentage), 0)})
              </div>
            </CardContent>
          </Card>

          {/* Team Capacity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Bezetting</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(data.capacity.averageOccupation, 0)}</div>
              <Progress
                value={Math.min(capacityProgress, 100)}
                className="mt-2"
                indicatorClassName={capacityProgress > 80 ? "bg-red-500" : capacityProgress > 70 ? "bg-amber-500" : "bg-green-500"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {data.capacity.totalPlannedHours.toFixed(0)} / {data.capacity.totalMaxHours.toFixed(0)} uur
              </p>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waarschuwingen</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.length}</div>
              <div className="flex items-center gap-2 mt-2">
                {data.capacity.criticalCount > 0 && (
                  <Badge variant="danger">{data.capacity.criticalCount} kritiek</Badge>
                )}
                {data.capacity.alertCount - data.capacity.criticalCount > 0 && (
                  <Badge variant="warning">{data.capacity.alertCount - data.capacity.criticalCount} alert</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Overzicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bruto forecast</span>
                <span className="font-medium">{formatCurrency(data.sales.grossForecast)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Netto forecast</span>
                <span className="font-medium">{formatCurrency(data.sales.netForecast)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Gewogen prospects</span>
                <span className="font-medium">{formatCurrency(data.sales.weightedProspects)}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Totaal netto</span>
                <span className="font-bold">{formatCurrency(data.sales.totalNetForecast)}</span>
              </div>
              {data.sales.clientsNeeded > 0 && (
                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Target niet behaald</AlertTitle>
                  <AlertDescription>
                    Er zijn nog {data.sales.clientsNeeded} klanten nodig (gem. {formatCurrency(data.sales.avgClientValue)}) om het target te behalen.
                  </AlertDescription>
                </Alert>
              )}
              <Link href="/sales" className="block">
                <button className="w-full mt-2 text-sm text-[#1a365d] hover:underline">
                  Bekijk sales dashboard →
                </button>
              </Link>
            </CardContent>
          </Card>

          {/* Capacity Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Capaciteit Overzicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Medewerkers</span>
                <span className="font-medium">{data.capacity.employeeCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Werkdagen</span>
                <span className="font-medium">{data.capacity.workingDays} dagen</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Max capaciteit</span>
                <span className="font-medium">{data.capacity.totalMaxHours.toFixed(0)} uur</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Geplande uren</span>
                <span className="font-medium">{data.capacity.totalPlannedHours.toFixed(0)} uur</span>
              </div>
              <hr />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Gemiddelde bezetting</span>
                <span className={`font-bold ${data.capacity.averageOccupation > 0.8 ? 'text-red-600' : data.capacity.averageOccupation > 0.7 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatPercentage(data.capacity.averageOccupation, 0)}
                </span>
              </div>
              <Link href="/capacity" className="block">
                <button className="w-full mt-2 text-sm text-[#1a365d] hover:underline">
                  Bekijk capaciteit overzicht →
                </button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Actieve Waarschuwingen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <Alert
                    key={alert.id}
                    variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'alert' ? 'destructive' : 'warning'}
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{alert.title}</AlertTitle>
                    <AlertDescription>
                      {alert.description}
                      {alert.link && (
                        <Link href={alert.link} className="block mt-1 text-sm underline">
                          Bekijk details →
                        </Link>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
                {alerts.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    En nog {alerts.length - 5} andere waarschuwingen...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/forecast">
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Clock className="h-8 w-8 text-[#1a365d] mb-2" />
                <span className="text-sm font-medium">Forecast</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/capacity">
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Users className="h-8 w-8 text-[#1a365d] mb-2" />
                <span className="text-sm font-medium">Capaciteit</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/clients">
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <DollarSign className="h-8 w-8 text-[#1a365d] mb-2" />
                <span className="text-sm font-medium">Klanten</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/risk">
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <AlertTriangle className="h-8 w-8 text-[#1a365d] mb-2" />
                <span className="text-sm font-medium">Risico's</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
