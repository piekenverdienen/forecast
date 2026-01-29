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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Edit, UserX, Calendar, Eye, Trash2 } from "lucide-react"
import { getDutchMonth } from "@/lib/utils"

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
    notes?: string
  }[]
}

interface LeaveFormData {
  startDate: string
  endDate: string
  hours: string
  type: string
  notes: string
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
  const [isYearOverviewOpen, setIsYearOverviewOpen] = useState(false)
  const [yearOverviewYear, setYearOverviewYear] = useState(new Date().getFullYear())

  // Form state for employee
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    hoursPerWeek: "40",
    billableTarget: "0.8",
  })

  // Form state for leave
  const [leaveFormData, setLeaveFormData] = useState<LeaveFormData>({
    startDate: "",
    endDate: "",
    hours: "8",
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
      // Update employee basic info
      const employeeRes = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      })

      if (!employeeRes.ok) {
        console.error("Failed to update employee")
        return
      }

      // Create new contract with updated hours and target
      const currentContract = activeContract(selectedEmployee)
      const newHoursPerWeek = parseFloat(formData.hoursPerWeek)
      const newBillableTarget = parseFloat(formData.billableTarget)

      // Only create new contract if values changed
      if (
        currentContract &&
        (currentContract.hoursPerWeek !== newHoursPerWeek ||
          currentContract.billableTarget !== newBillableTarget)
      ) {
        const contractRes = await fetch(`/api/employees/${selectedEmployee.id}/contracts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hoursPerWeek: newHoursPerWeek,
            billableTarget: newBillableTarget,
            startDate: new Date().toISOString(),
          }),
        })

        if (!contractRes.ok) {
          console.error("Failed to update contract")
        }
      }

      setIsEditDialogOpen(false)
      fetchEmployees()
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

  const handleAddLeave = async () => {
    if (!selectedEmployee) return

    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(leaveFormData.startDate).toISOString(),
          endDate: new Date(leaveFormData.endDate).toISOString(),
          hours: parseFloat(leaveFormData.hours),
          type: leaveFormData.type,
          notes: leaveFormData.notes || undefined,
        }),
      })

      if (res.ok) {
        setIsLeaveDialogOpen(false)
        setLeaveFormData({
          startDate: "",
          endDate: "",
          hours: "8",
          type: "VACATION",
          notes: "",
        })
        fetchEmployees()
      }
    } catch (error) {
      console.error("Failed to add leave:", error)
    }
  }

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm("Weet je zeker dat je dit verlof wilt verwijderen?")) return

    try {
      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchEmployees()
      }
    } catch (error) {
      console.error("Failed to delete leave:", error)
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
    setLeaveFormData({
      startDate: "",
      endDate: "",
      hours: "8",
      type: "VACATION",
      notes: "",
    })
    setIsLeaveDialogOpen(true)
  }

  const openYearOverview = (employee: Employee) => {
    setSelectedEmployee(employee)
    setYearOverviewYear(selectedYear)
    setIsYearOverviewOpen(true)
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

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "VACATION":
        return "Vakantie"
      case "SICK":
        return "Ziek"
      case "OTHER":
        return "Overig"
      default:
        return type
    }
  }

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success">Goedgekeurd</Badge>
      case "PENDING":
        return <Badge variant="warning">In afwachting</Badge>
      case "REJECTED":
        return <Badge variant="destructive">Afgewezen</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getLeavesForYear = (employee: Employee, year: number) => {
    return employee.leaves.filter((leave) => {
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)
      return startDate.getFullYear() === year || endDate.getFullYear() === year
    })
  }

  const calculateTotalLeaveHours = (employee: Employee, year: number, type?: string) => {
    const leaves = getLeavesForYear(employee, year).filter(
      (leave) => leave.status === "APPROVED" && (!type || leave.type === type)
    )
    return leaves.reduce((sum, leave) => sum + leave.hours, 0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
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
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Acties</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                  const contract = activeContract(employee)
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
                        {contract ? `${(contract.billableTarget * 100).toFixed(0)}%` : "-"}
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
                              variant="ghost"
                              size="icon"
                              onClick={() => openYearOverview(employee)}
                              title="Jaaroverzicht"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openLeaveDialog(employee)}
                              title="Verlof toevoegen"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(employee)}
                              title="Bewerken"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {employee.isActive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeactivate(employee.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Deactiveren"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-hours">Contract uren/week</Label>
                <Input
                  id="edit-hours"
                  type="number"
                  value={formData.hoursPerWeek}
                  onChange={(e) => setFormData({ ...formData, hoursPerWeek: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-target">Declarabel target</Label>
                <Input
                  id="edit-target"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={formData.billableTarget}
                  onChange={(e) => setFormData({ ...formData, billableTarget: e.target.value })}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Let op: bij het wijzigen van uren of target wordt een nieuw contract aangemaakt met de huidige datum als startdatum.
            </p>
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
            <DialogTitle>
              Verlof toevoegen {selectedEmployee && `- ${selectedEmployee.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leave-start">Startdatum</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={leaveFormData.startDate}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-end">Einddatum</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={leaveFormData.endDate}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leave-hours">Totaal aantal uren</Label>
                <Input
                  id="leave-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={leaveFormData.hours}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, hours: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-type">Type verlof</Label>
                <Select
                  value={leaveFormData.type}
                  onValueChange={(value) => setLeaveFormData({ ...leaveFormData, type: value })}
                >
                  <SelectTrigger id="leave-type">
                    <SelectValue placeholder="Selecteer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACATION">Vakantie</SelectItem>
                    <SelectItem value="SICK">Ziek</SelectItem>
                    <SelectItem value="OTHER">Overig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-notes">Notities (optioneel)</Label>
              <Textarea
                id="leave-notes"
                value={leaveFormData.notes}
                onChange={(e) => setLeaveFormData({ ...leaveFormData, notes: e.target.value })}
                placeholder="Eventuele opmerkingen..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleAddLeave}>Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Year Overview Dialog */}
      <Dialog open={isYearOverviewOpen} onOpenChange={setIsYearOverviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Jaaroverzicht {selectedEmployee && `- ${selectedEmployee.name}`}
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6 py-4">
              {/* Year selector */}
              <div className="flex items-center gap-4">
                <Label>Jaar:</Label>
                <Select
                  value={yearOverviewYear.toString()}
                  onValueChange={(value) => setYearOverviewYear(parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - 2 + i
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xl font-bold">
                      {calculateTotalLeaveHours(selectedEmployee, yearOverviewYear)} uur
                    </div>
                    <p className="text-sm text-muted-foreground">Totaal verlof</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xl font-bold">
                      {calculateTotalLeaveHours(selectedEmployee, yearOverviewYear, "VACATION")} uur
                    </div>
                    <p className="text-sm text-muted-foreground">Vakantie</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xl font-bold">
                      {calculateTotalLeaveHours(selectedEmployee, yearOverviewYear, "SICK")} uur
                    </div>
                    <p className="text-sm text-muted-foreground">Ziekteverzuim</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xl font-bold">
                      {calculateTotalLeaveHours(selectedEmployee, yearOverviewYear, "OTHER")} uur
                    </div>
                    <p className="text-sm text-muted-foreground">Overig verlof</p>
                  </CardContent>
                </Card>
              </div>

              {/* Contract info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contractgegevens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Huidige uren/week</p>
                      <p className="font-medium">
                        {activeContract(selectedEmployee)?.hoursPerWeek || "-"} uur
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Declarabel target</p>
                      <p className="font-medium">
                        {activeContract(selectedEmployee)
                          ? `${(activeContract(selectedEmployee)!.billableTarget * 100).toFixed(0)}%`
                          : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leave list */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Verlof in {yearOverviewYear}</CardTitle>
                </CardHeader>
                <CardContent>
                  {getLeavesForYear(selectedEmployee, yearOverviewYear).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Periode</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Uren</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notities</TableHead>
                          {isAdmin && <TableHead className="text-right">Acties</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getLeavesForYear(selectedEmployee, yearOverviewYear)
                          .sort(
                            (a, b) =>
                              new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                          )
                          .map((leave) => (
                            <TableRow key={leave.id}>
                              <TableCell>
                                {formatDate(leave.startDate)}
                                {leave.startDate !== leave.endDate &&
                                  ` - ${formatDate(leave.endDate)}`}
                              </TableCell>
                              <TableCell>{getLeaveTypeLabel(leave.type)}</TableCell>
                              <TableCell>{leave.hours} uur</TableCell>
                              <TableCell>{getLeaveStatusBadge(leave.status)}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {leave.notes || "-"}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteLeave(leave.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-4 text-muted-foreground">
                      Geen verlof geregistreerd voor {yearOverviewYear}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsYearOverviewOpen(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
