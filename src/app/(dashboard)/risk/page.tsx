"use client"

import { useEffect, useState } from "react"
import { useMonth } from "@/components/layout/month-context"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatPercentage, getDutchMonth } from "@/lib/utils"
import { AlertTriangle, Building2, Users, PieChart } from "lucide-react"

interface ClientRisk {
  client: {
    id: string
    name: string
    classification: string
    clientType: string
  }
  monthlyBudget: number
  revenueShare: number
  riskLevel: string
  impactedEmployees: {
    employeeId: string
    employeeName: string
    hours: number
  }[]
}

interface RiskData {
  year: number
  month: number
  clients: ClientRisk[]
  summary: {
    totalRevenue: number
    clientCount: number
    highRiskCount: number
    mediumRiskCount: number
    lowRiskCount: number
    b2bCount: number
    b2bRevenue: number
    b2cCount: number
    b2cRevenue: number
    classificationDistribution: {
      A: number
      B: number
      C: number
      D: number
    }
  }
}

export default function RiskPage() {
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [data, setData] = useState<RiskData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/risk?year=${selectedYear}&month=${selectedMonth}`)
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch (error) {
        console.error("Failed to fetch risk data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedMonth, selectedYear])

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return <Badge variant="danger">Hoog risico</Badge>
      case "medium":
        return <Badge variant="warning">Gemiddeld</Badge>
      default:
        return <Badge variant="success">Laag</Badge>
    }
  }

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <Header
          title="Risico Dashboard"
          subtitle={`Klantconcentratie analyse voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
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
        title="Risico Dashboard"
        subtitle={`Klantconcentratie analyse voor ${getDutchMonth(selectedMonth)} ${selectedYear}`}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Omzet</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">{data.summary.clientCount} klanten</p>
            </CardContent>
          </Card>

          <Card className={data.summary.highRiskCount > 0 ? "border-red-200" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoog Risico</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.summary.highRiskCount}</div>
              <p className="text-xs text-muted-foreground">klanten &gt;10% omzet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">B2B Klanten</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.b2bCount}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(data.summary.b2bRevenue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">B2C Klanten</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.b2cCount}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(data.summary.b2cRevenue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Classification Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Klant Classificatie Verdeling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(data.summary.classificationDistribution).map(([classification, count]) => (
                <div key={classification} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{classification}-klanten</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* High Risk Warning */}
        {data.summary.highRiskCount > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Concentratierisico Waarschuwing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-800">
                Er zijn <strong>{data.summary.highRiskCount}</strong> klanten die meer dan 10% van de omzet vertegenwoordigen.
                Bij vertrek van deze klanten is er een significant risico voor de bedrijfscontinuiteit.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Client Risk Table */}
        <Card>
          <CardHeader>
            <CardTitle>Klant Concentratie Analyse</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Classificatie</TableHead>
                  <TableHead className="text-right">Maandomzet</TableHead>
                  <TableHead className="text-right">Omzetaandeel</TableHead>
                  <TableHead>Risico</TableHead>
                  <TableHead>Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.clients.map((client) => (
                  <TableRow
                    key={client.client.id}
                    className={client.riskLevel === "high" ? "bg-red-50" : client.riskLevel === "medium" ? "bg-amber-50" : ""}
                  >
                    <TableCell>
                      <div className="font-medium">{client.client.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.client.clientType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{client.client.classification}-klant</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(client.monthlyBudget)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress
                          value={client.revenueShare * 100}
                          className="w-20 h-2"
                          indicatorClassName={
                            client.riskLevel === "high"
                              ? "bg-red-500"
                              : client.riskLevel === "medium"
                              ? "bg-amber-500"
                              : "bg-green-500"
                          }
                        />
                        <span className="w-12 text-right">{formatPercentage(client.revenueShare, 1)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRiskBadge(client.riskLevel)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{client.impactedEmployees.length}</span> medewerkers
                        {client.impactedEmployees.length > 0 && (
                          <div className="text-muted-foreground">
                            {client.impactedEmployees.reduce((sum, e) => sum + e.hours, 0).toFixed(1)} uur totaal
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {data.clients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Geen klantdata beschikbaar voor deze maand
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Risico Classificatie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div>
                  <div className="font-medium">Hoog risico</div>
                  <div className="text-sm text-muted-foreground">&gt;10% van omzet</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div>
                  <div className="font-medium">Gemiddeld risico</div>
                  <div className="text-sm text-muted-foreground">5-10% van omzet</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <div className="font-medium">Laag risico</div>
                  <div className="text-sm text-muted-foreground">&lt;5% van omzet</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
