"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

interface TeamMember {
  id: string
  name: string
  email: string
  role: "instructor" | "admin"
}

export default function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: "1", name: "John Doe", email: "john@example.com", role: "instructor" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", role: "admin" },
  ])
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "instructor" as const })

  const handleAddMember = () => {
    if (newMember.name && newMember.email) {
      setTeamMembers([...teamMembers, { ...newMember, id: Date.now().toString() }])
      setNewMember({ name: "", email: "", role: "instructor" })
    }
  }

  const handleRemoveMember = (id: string) => {
    setTeamMembers(teamMembers.filter((member) => member.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Team</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={newMember.role}
                onValueChange={(value: "instructor" | "admin") => setNewMember({ ...newMember, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAddMember}>
            <Plus className="mr-2 h-4 w-4" /> Add Team Member
          </Button>
        </div>
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell className="capitalize">{member.role}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

