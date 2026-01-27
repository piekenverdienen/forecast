"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { useMonth } from "@/components/layout/month-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Settings,
  Building2,
  Calculator,
  Receipt,
  Bell,
  Users,
  Save,
  RotateCcw,
  Plus,
  Edit,
  AlertTriangle,
} from "lucide-react"
import { formatPercentage } from "@/lib/utils"

interface Setting {
  id: string
  key: string
  value: string
  description: string | null
  category: string
}

interface Role {
  id: string
  name: string
  description: string | null
  billableTarget: number
  isDefault: boolean
}

const categoryInfo: Record<string, { title: string; icon: React.ReactNode; description: string }> = {
  GENERAL: {
    title: "Algemeen",
    icon: <Building2 className="h-5 w-5" />,
    description: "Algemene bedrijfsinstellingen",
  },
  CAPACITY: {
    title: "Capaciteit",
    icon: <Calculator className="h-5 w-5" />,
    description: "Instellingen voor capaciteitsberekeningen",
  },
  INVOICING: {
    title: "Facturatie",
    icon: <Receipt className="h-5 w-5" />,
    description: "Facturatie-instellingen",
  },
  NOTIFICATIONS: {
    title: "Notificaties",
    icon: <Bell className="h-5 w-5" />,
    description: "Notificatie-instellingen",
  },
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [settings, setSettings] = useState<Setting[]>([])
  const [groupedSettings, setGroupedSettings] = useState<Record<string, Setting[]>>({})
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const isAdmin = session?.user?.role === "ADMIN"

  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    billableTarget: "0.80",
    isDefault: false,
  })

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [settingsRes, rolesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/roles"),
      ])

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data.settings)
        setGroupedSettings(data.grouped)
        // Initialize edited values
        const initial: Record<string, string> = {}
        data.settings.forEach((s: Setting) => {
          initial[s.key] = s.value
        })
        setEditedValues(initial)
      }

      if (rolesRes.ok) {
        const data = await rolesRes.json()
        setRoles(data)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleValueChange = (key: string, value: string) => {
    setEditedValues({ ...editedValues, [key]: value })
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      for (const setting of settings) {
        if (editedValues[setting.key] !== setting.value) {
          await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: setting.key,
              value: editedValues[setting.key],
            }),
          })
        }
      }
      setHasChanges(false)
      fetchData()
    } catch (error) {
      console.error("Failed to save settings:", error)
    }
  }

  const handleReset = async () => {
    if (!confirm("Weet je zeker dat je alle instellingen wilt resetten naar standaard?")) return

    try {
      await fetch("/api/settings", { method: "POST" })
      fetchData()
      setHasChanges(false)
    } catch (error) {
      console.error("Failed to reset settings:", error)
    }
  }

  const openRoleDialog = (role?: Role) => {
    if (role) {
      setSelectedRole(role)
      setRoleForm({
        name: role.name,
        description: role.description || "",
        billableTarget: role.billableTarget.toString(),
        isDefault: role.isDefault,
      })
    } else {
      setSelectedRole(null)
      setRoleForm({
        name: "",
        description: "",
        billableTarget: "0.80",
        isDefault: false,
      })
    }
    setIsRoleDialogOpen(true)
  }

  const handleSaveRole = async () => {
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleForm.name,
          description: roleForm.description || null,
          billableTarget: parseFloat(roleForm.billableTarget),
          isDefault: roleForm.isDefault,
        }),
      })

      if (res.ok) {
        setIsRoleDialogOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error("Failed to save role:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Header
          title="Instellingen"
          subtitle="Beheer applicatie-instellingen"
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          showMonthSelector={false}
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a365d]"></div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Header
          title="Instellingen"
          subtitle="Beheer applicatie-instellingen"
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          showMonthSelector={false}
        />
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Geen toegang</AlertTitle>
          <AlertDescription>
            Je hebt geen toegang tot de instellingen. Neem contact op met een administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Instellingen"
        subtitle="Beheer applicatie-instellingen"
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        showMonthSelector={false}
      />

      <div className="p-6 space-y-6">
        {/* Action buttons */}
        {hasChanges && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertTitle>Onopgeslagen wijzigingen</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Je hebt wijzigingen die nog niet opgeslagen zijn.</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchData()}>
                  Annuleren
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Opslaan
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Settings by category */}
        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {categoryInfo[category]?.icon}
                {categoryInfo[category]?.title || category}
              </CardTitle>
              <CardDescription>
                {categoryInfo[category]?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorySettings.map((setting) => (
                  <div key={setting.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                      <Label className="font-medium">{setting.description || setting.key}</Label>
                      <p className="text-xs text-muted-foreground">{setting.key}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        value={editedValues[setting.key] || ""}
                        onChange={(e) => handleValueChange(setting.key, e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Roles Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Rollen & Declarabiliteit
                </CardTitle>
                <CardDescription>
                  Beheer rollen met standaard declarabel percentages
                </CardDescription>
              </div>
              <Button onClick={() => openRoleDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Rol toevoegen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Beschrijving</TableHead>
                  <TableHead className="text-right">Declarabel %</TableHead>
                  <TableHead>Standaard</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatPercentage(role.billableTarget, 0)}
                    </TableCell>
                    <TableCell>
                      {role.isDefault && <Badge variant="success">Standaard</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openRoleDialog(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Reset button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <RotateCcw className="h-5 w-5" />
              Reset Instellingen
            </CardTitle>
            <CardDescription>
              Zet alle instellingen terug naar standaardwaarden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset naar standaard
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? "Rol bewerken" : "Rol toevoegen"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Naam</Label>
              <Input
                id="roleName"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="Consultant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDesc">Beschrijving</Label>
              <Input
                id="roleDesc"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Optionele beschrijving"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billableTarget">Declarabel percentage (0-1)</Label>
              <Input
                id="billableTarget"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={roleForm.billableTarget}
                onChange={(e) => setRoleForm({ ...roleForm, billableTarget: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Voorbeeld: 0.80 = 80% declarabel
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={roleForm.isDefault}
                onChange={(e) => setRoleForm({ ...roleForm, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isDefault" className="font-normal cursor-pointer">
                Standaard rol voor nieuwe medewerkers
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSaveRole}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
