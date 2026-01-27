"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { useMonth } from "@/components/layout/month-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Edit, UserX, Calendar, FileText, Palmtree } from "lucide-react"
import { getDutchMonth, formatPercentage } from "@/lib/utils"

interface Employee {
  id: string
  name: string
  email: string
  hourlyRate: number
  isActive: boolean
  contracts: {
    id: string
    hoursPerWeek: number
    billableTarget: number
    startDate: string
    endDate: string | null
  }[]
  leaves: {
    id: string
    startDate: string
    endDate: string
    hours: number
    type: string
    status: string
  }[]
}

export default function EmployeesPage() {
  const { data: session } = useSession()
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    hoursPerWeek: "40",
    billableTarget: "0.8",
  })

  // Leave form state
  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    hours: "",
    type: "VACATION",
    notes: "",
  })

  const isAdmin = session?.user?.role === "ADMIN"

  const fetchEmployees = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/employees?includeInactive=true")
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleAddEmployee = async () => {
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          hoursPerWeek: parseFloat(formData.hoursPerWeek),
          billableTarget: parseFloat(formData.billableTarget),
        }),
      })

      if (res.ok) {
        setIsAddDialogOpen(false)
        setFormData({ name: "", email: "", hoursPerWeek: "40", billableTarget: "0.8" })
        fetchEmployees()
      }
    } catch (error) {
      console.error("Failed to add employee:", error)
    }
  }

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return

    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      })

      if (res.ok) {
        setIsEditDialogOpen(false)
        fetchEmployees()
      }
    } catch (error) {
      console.error("Failed to update employee:", error)
    }
  }

  const handleDeactivate = async (employeeId: string) => {
    if (!confirm("Weet je zeker dat je deze medewerker wilt deactiveren?")) return

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchEmployees()
      }
    } catch (error) {
      console.error("Failed to deactivate employee:", error)
    }
  }

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email,
      hoursPerWeek: employee.contracts[0]?.hoursPerWeek.toString() || "40",
      billableTarget: employee.contracts[0]?.billableTarget.toString() || "0.8",
    })
    setIsEditDialogOpen(true)
  }

  const openLeaveDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setLeaveForm({
      startDate: "",
      endDate: "",
      hours: "",
      type: "VACATION",
      notes: "",
    })
    setIsLeaveDialogOpen(true)
  }

  const handleAddLeave = async () => {
    if (!selectedEmployee) return

    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          hours: parseFloat(leaveForm.hours),
          type: leaveForm.type,
          notes: leaveForm.notes || null,
        }),
      })

      if (res.ok) {
        setIsLeaveDialogOpen(false)
        fetchEmployees()
      }
    } catch (error) {
      console.error("Failed to add leave:", error)
    }
  }

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeContract = (employee: Employee) => {
    return employee.contracts.find(
      (c) => !c.endDate || new Date(c.endDate) >= new Date()
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Header
          title="Medewerkers"
          subtitle="Beheer medewerkers en contracten"
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
        title="Medewerkers"
        subtitle="Beheer medewerkers en contracten"
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />

      <div className="p-6 space-y-6">
        {/* Actions bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Zoek medewerker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Medewerker toevoegen
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{employees.filter((e) => e.isActive).length}</div>
              <p className="text-sm text-muted-foreground">Actieve medewerkers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {employees.reduce((sum, e) => sum + (activeContract(e)?.hoursPerWeek || 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Totaal contracturen/week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{employees.filter((e) => !e.isActive).length}</div>
              <p className="text-sm text-muted-foreground">Inactieve medewerkers</p>
            </CardContent>
          </Card>
        </div>

        {/* Employee Table */}
        <Card>
          <CardHeader>
            <CardTitle>Medewerkers Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Verlof</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Acties</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                  const contract = activeContract(employee)
                  const pendingLeaves = employee.leaves.filter(l => l.status === "PENDING").length
                  const approvedLeaves = employee.leaves.filter(l => l.status === "APPROVED").length
                  return (
                    <TableRow key={employee.id} className={!employee.isActive ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="font-medium">{employee.name}</div>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        {contract ? `${contract.hoursPerWeek} uur/week` : "-"}
                      </TableCell>
                      <TableCell>
                        {contract ? formatPercentage(contract.billableTarget, 0) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {approvedLeaves > 0 && (
                            <Badge variant="success" className="text-xs">
                              {approvedLeaves} goedgekeurd
                            </Badge>
                          )}
                          {pendingLeaves > 0 && (
                            <Badge variant="warning" className="text-xs">
                              {pendingLeaves} pending
                            </Badge>
                          )}
                          {approvedLeaves === 0 && pendingLeaves === 0 && (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? "success" : "secondary"}>
                          {employee.isActive ? "Actief" : "Inactief"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openLeaveDialog(employee)}
                            >
                              <Palmtree className="h-4 w-4 mr-1" />
                              Verlof
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(employee)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {employee.isActive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeactivate(employee.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500">Geen medewerkers gevonden</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medewerker toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Volledige naam"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="naam@yourfellow.nl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Contract uren/week</Label>
                <Input
                  id="hours"
                  type="number"
                  value={formData.hoursPerWeek}
                  onChange={(e) => setFormData({ ...formData, hoursPerWeek: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Declarabel target</Label>
                <Input
                  id="target"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={formData.billableTarget}
                  onChange={(e) => setFormData({ ...formData, billableTarget: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddEmployee}>Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medewerker bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Naam</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mailadres</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleEditEmployee}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Leave Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verlof toevoegen - {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Startdatum</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Einddatum</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Aantal uren</Label>
                <Input
                  id="hours"
                  type="number"
                  value={leaveForm.hours}
                  onChange={(e) => setLeaveForm({ ...leaveForm, hours: e.target.value })}
                  placeholder="bv. 40"
                />
              </div>
              <div className="space-y-2">
                <Label>Type verlof</Label>
                <Select
                  value={leaveForm.type}
                  onValueChange={(value) => setLeaveForm({ ...leaveForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACATION">Vakantie</SelectItem>
                    <SelectItem value="SICK">Ziekte</SelectItem>
                    <SelectItem value="OTHER">Overig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notities (optioneel)</Label>
              <Input
                id="notes"
                value={leaveForm.notes}
                onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })}
                placeholder="Optionele notities..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddLeave}>
              <Palmtree className="h-4 w-4 mr-2" />
              Verlof toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
