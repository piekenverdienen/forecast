"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getDutchMonth } from "@/lib/utils"

interface HeaderProps {
  title: string
  subtitle?: string
  selectedMonth: number
  selectedYear: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  alertCount?: number
  showMonthSelector?: boolean
}

export function Header({
  title,
  subtitle,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  alertCount = 0,
  showMonthSelector = true,
}: HeaderProps) {
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Month/Year selector */}
        <div className="flex items-center gap-2">
          {showMonthSelector && (
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => onMonthChange(parseInt(value))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Maand" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {getDutchMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => onYearChange(parseInt(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Jaar" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notifications */}
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {alertCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {alertCount > 9 ? "9+" : alertCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  )
}
