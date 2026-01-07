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
import { useClientAuthState } from "@/utils/client-auth"
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
import { useTeamMembers, useCreateTeamMember, useDeleteUser, type TeamMember } from "@/lib/react-query/hooks/useUsers"
import TableSkeleton from "@/components/TableSkeleton"

export default function TeamManagement() {
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [newMember, setNewMember] = useState<{ name: string; email: string; password: string; role: "admin" | "instructor" }>({
    name: "",
    email: "",
    password: "",
    role: "admin",
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const { data: teamData, isPending: teamPending, error: teamError } = useTeamMembers()
  const createMemberMutation = useCreateTeamMember()
  const deleteUserMutation = useDeleteUser()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render if not authenticated or not admin
  if (authLoading || !user || userType !== "admin") {
    return null
  }

  const teamMembers: TeamMember[] = (teamData?.users || []).map((user: any) => ({
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    user_type: user.user_type || "admin",
  }))

  // Check if we have cached data
  const hasCachedData = !!teamData?.users?.length
  
  // Show skeleton only on true initial load (no cached data exists and pending)
  const showSkeleton = !mounted || (teamPending && !hasCachedData)
  
  // Show error only if we have no cached data
  const error = teamError && !hasCachedData ? (teamError as Error).message : null

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.password) {
      toast.error("Please fill in all fields")
      return
    }

    try {
      await createMemberMutation.mutateAsync({
        name: newMember.name,
        email: newMember.email,
        password: newMember.password,
        userType: newMember.role,
      })
      setNewMember({ name: "", email: "", password: "", role: "admin" as "admin" | "instructor" })
      toast.success("Team member added successfully")
    } catch (err: any) {
      console.error("Error adding team member:", err)
      toast.error(err.message || "Failed to add team member")
    }
  }

  const handleRemoveClick = (id: string) => {
    setMemberToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleRemoveConfirm = async () => {
    if (!memberToDelete) return

    try {
      await deleteUserMutation.mutateAsync(memberToDelete)
      toast.success("Team member removed successfully")
      setDeleteDialogOpen(false)
      setMemberToDelete(null)
    } catch (err: any) {
      console.error("Error removing team member:", err)
      toast.error(err.message || "Failed to remove team member")
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
                disabled={createMemberMutation.isPending}
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
                disabled={createMemberMutation.isPending}
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
                disabled={createMemberMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={newMember.role}
                onValueChange={(value: "admin" | "instructor") => setNewMember({ ...newMember, role: value })}
                disabled={createMemberMutation.isPending}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAddMember} disabled={createMemberMutation.isPending}>
            {createMemberMutation.isPending ? (
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
          {showSkeleton ? (
            <TableSkeleton columns={4} rows={5} />
          ) : teamMembers.length === 0 && !teamPending ? (
            <div className="text-center text-muted-foreground py-8">
              No team members found
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
                      disabled={deleteUserMutation.isPending && memberToDelete === member.id}
                    >
                      {deleteUserMutation.isPending && memberToDelete === member.id ? (
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
              <AlertDialogCancel disabled={deleteUserMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveConfirm}
                disabled={deleteUserMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteUserMutation.isPending ? (
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
