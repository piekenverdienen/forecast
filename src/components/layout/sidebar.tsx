"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  BarChart3,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    role: string
  }
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Capaciteit", href: "/capacity", icon: BarChart3 },
  { name: "Forecast", href: "/forecast", icon: CalendarDays },
  { name: "Medewerkers", href: "/employees", icon: Users },
  { name: "Klanten", href: "/clients", icon: Building2 },
  { name: "Facturatie", href: "/invoicing", icon: Receipt },
  { name: "Jaaroverzicht", href: "/yearly", icon: Calendar },
  { name: "Sales", href: "/sales", icon: BarChart3 },
  { name: "Risico's", href: "/risk", icon: AlertTriangle },
]

const adminNavigation = [
  { name: "Instellingen", href: "/settings", icon: Settings },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const isAdmin = user.role === "ADMIN"

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-[#1a365d] text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center font-bold">
              YF
            </div>
            <span className="font-semibold">YourFellow</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-white/10"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <Separator className="bg-white/10 my-4" />
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <Separator className="bg-white/10" />

      {/* User section */}
      <div className="p-4">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="h-9 w-9 border border-white/20">
            <AvatarFallback className="bg-white/10 text-white text-sm">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-white/60 truncate">{user.role}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
