"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TeamMember {
  id: string
  name: string
  email: string
  user_type: "admin" | "user"
}

export default function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [newMember, setNewMember] = useState<{ name: string; email: string; password: string; role: "admin" }>({
    name: "",
    email: "",
    password: "",
    role: "admin",
  })
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null)

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/users?userType=admin")
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch team members")
        }

        const data = await response.json()
        const processedMembers = (data.users || []).map((user: any) => ({
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          user_type: user.user_type || "admin",
        }))
        setTeamMembers(processedMembers)
      } catch (err: any) {
        console.error("Error fetching team members:", err)
        setError(err.message || "Failed to load team members")
        toast.error(err.message || "Failed to load team members")
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [])

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.password) {
      toast.error("Please fill in all fields")
      return
    }

    try {
      setAdding(true)
      setError(null)

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newMember.name,
          email: newMember.email,
          password: newMember.password,
          userType: newMember.role,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create team member")
      }

      const data = await response.json()
      setTeamMembers([...teamMembers, data.user])
      setNewMember({ name: "", email: "", password: "", role: "admin" })
      toast.success("Team member added successfully")
    } catch (err: any) {
      console.error("Error adding team member:", err)
      setError(err.message || "Failed to add team member")
      toast.error(err.message || "Failed to add team member")
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveClick = (id: string) => {
    setMemberToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!memberToDelete) return

    try {
      setRemoving(memberToDelete)
      const response = await fetch(`/api/users/${memberToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to remove team member")
      }

      setTeamMembers(teamMembers.filter((member) => member.id !== memberToDelete))
      toast.success("Team member removed successfully")
      setDeleteDialogOpen(false)
      setMemberToDelete(null)
    } catch (err: any) {
      console.error("Error removing team member:", err)
      toast.error(err.message || "Failed to remove team member")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Team</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                placeholder="Enter name"
                disabled={adding}
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
                disabled={adding}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newMember.password}
                onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                placeholder="Enter password"
                disabled={adding}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={newMember.role}
                onValueChange={(value: "admin") => setNewMember({ ...newMember, role: value })}
                disabled={adding}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAddMember} disabled={adding}>
            {adding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
            <Plus className="mr-2 h-4 w-4" /> Add Team Member
              </>
            )}
          </Button>
        </div>
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
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
                {teamMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                      <TableCell className="capitalize">{member.user_type}</TableCell>
                  <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClick(member.id)}
                          disabled={removing === member.id}
                        >
                          {removing === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                      <Trash2 className="h-4 w-4" />
                          )}
                    </Button>
                  </TableCell>
                </TableRow>
                  ))
                )}
            </TableBody>
          </Table>
          )}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the team member and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removing !== null}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveConfirm}
                disabled={removing !== null}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
