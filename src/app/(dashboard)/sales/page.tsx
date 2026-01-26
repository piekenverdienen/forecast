"use client"

import { useEffect, useState } from "react"
import { useMonth } from "@/components/layout/month-context"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, formatPercentage, getDutchMonth } from "@/lib/utils"
import { TrendingUp, TrendingDown, Target, Users, DollarSign } from "lucide-react"

interface DashboardData {
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
}

export default function SalesPage() {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/dashboard?year=${selectedYear}&month=${selectedMonth}`)
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch (error) {
        console.error("Failed to fetch sales data:", error)
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
          title="Sales Dashboard"
          subtitle={`Omzetoverzicht voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
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

  const progressPercentage = data.sales.target > 0
    ? (data.sales.totalNetForecast / data.sales.target) * 100
    : 0

  const isOnTarget = data.sales.difference >= 0

  return (
    <div>
      <Header
        title="Sales Dashboard"
        subtitle={`Omzetoverzicht voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      <div className="p-6 space-y-6">
        {/* Target Gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Target Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-4xl font-bold">{formatPercentage(progressPercentage / 100, 0)}</div>
                  <div className="text-sm text-muted-foreground">van target behaald</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{formatCurrency(data.sales.totalNetForecast)}</div>
                  <div className="text-sm text-muted-foreground">van {formatCurrency(data.sales.target)}</div>
                </div>
              </div>
              <Progress
                value={Math.min(progressPercentage, 100)}
                className="h-4"
                indicatorClassName={isOnTarget ? "bg-green-500" : progressPercentage > 80 ? "bg-amber-500" : "bg-red-500"}
              />
              <div className={`flex items-center gap-2 text-lg ${isOnTarget ? "text-green-600" : "text-red-600"}`}>
                {isOnTarget ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span>{formatCurrency(Math.abs(data.sales.difference))}</span>
                <span className="text-sm">
                  {isOnTarget ? "boven target" : "onder target"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bruto Forecast</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.sales.grossForecast)}</div>
              <p className="text-xs text-muted-foreground">
                Inclusief tooling en inhuur
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Netto Forecast</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.sales.netForecast)}</div>
              <p className="text-xs text-muted-foreground">
                Excl. tooling, inhuur, prospects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gewogen Prospects</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.sales.weightedProspects)}</div>
              <p className="text-xs text-muted-foreground">
                Budget x kanspercentage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Target</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.sales.target)}</div>
              <p className="text-xs text-muted-foreground">
                Doel voor {getDutchMonth(selectedMonth)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action needed */}
        {data.sales.clientsNeeded > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Users className="h-5 w-5" />
                Actie Vereist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-amber-800">
                  Om het sales target te behalen zijn nog <strong>{data.sales.clientsNeeded}</strong> nieuwe klanten nodig
                  met een gemiddelde waarde van <strong>{formatCurrency(data.sales.avgClientValue)}</strong>.
                </p>
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-amber-700">{data.sales.clientsNeeded}</div>
                    <div className="text-sm text-gray-500">Klanten nodig</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-amber-700">{formatCurrency(data.sales.avgClientValue)}</div>
                    <div className="text-sm text-gray-500">Gem. klantwaarde</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-amber-700">
                      {formatCurrency(data.sales.clientsNeeded * data.sales.avgClientValue)}
                    </div>
                    <div className="text-sm text-gray-500">Totaal tekort</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Omzet Samenvatting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Bruto forecast (alle budgetten)</span>
                <span className="font-medium">{formatCurrency(data.sales.grossForecast)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Af: Tooling & Inhuur</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(data.sales.grossForecast - data.sales.netForecast - data.sales.weightedProspects)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Netto forecast (zeker)</span>
                <span className="font-medium">{formatCurrency(data.sales.netForecast)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Bij: Gewogen prospects</span>
                <span className="font-medium text-green-600">
                  +{formatCurrency(data.sales.weightedProspects)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
                <span className="font-medium">Totaal netto forecast</span>
                <span className="font-bold text-lg">{formatCurrency(data.sales.totalNetForecast)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Sales target</span>
                <span className="font-medium">{formatCurrency(data.sales.target)}</span>
              </div>
              <div className={`flex justify-between items-center py-2 ${isOnTarget ? "text-green-600" : "text-red-600"}`}>
                <span className="font-medium">Verschil</span>
                <span className="font-bold">
                  {isOnTarget ? "+" : ""}{formatCurrency(data.sales.difference)} ({formatPercentage(Math.abs(data.sales.differencePercentage), 0)})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
