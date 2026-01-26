"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface MonthContextType {
  selectedMonth: number
  selectedYear: number
  setSelectedMonth: (month: number) => void
  setSelectedYear: (year: number) => void
}

const MonthContext = createContext<MonthContextType | undefined>(undefined)

export function MonthProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  return (
    <MonthContext.Provider
      value={{
        selectedMonth,
        selectedYear,
        setSelectedMonth,
        setSelectedYear,
      }}
    >
      {children}
    </MonthContext.Provider>
  )
}

export function useMonth() {
  const context = useContext(MonthContext)
  if (context === undefined) {
    throw new Error("useMonth must be used within a MonthProvider")
  }
  return context
}
