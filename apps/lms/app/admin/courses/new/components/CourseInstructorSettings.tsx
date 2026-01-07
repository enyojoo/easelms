"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import FileUpload from "@/components/FileUpload"
import SafeImage from "@/components/SafeImage"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

interface Instructor {
  id: string
  name: string
  image?: string | null
  bio?: string | null
}

interface CourseInstructorSettingsProps {
  settings: {
    instructorEnabled: boolean
    instructorIds: string[]
  }
  onUpdate: (settings: any) => void
  courseId?: string | number
}

export default function CourseInstructorSettings({
  settings,
  onUpdate,
  courseId,
}: CourseInstructorSettingsProps) {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingInstructorId, setDeletingInstructorId] = useState<string | null>(null)

  // Form state for new/edit instructor
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    bio: "",
  })

  // Fetch all instructors only when instructor settings are enabled
  useEffect(() => {
    const fetchInstructors = async () => {
      if (!settings.instructorEnabled) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch("/api/instructors")
        if (!response.ok) {
          throw new Error("Failed to fetch instructors")
        }
        const data = await response.json()
        setInstructors(data.instructors || [])
      } catch (error: any) {
        console.error("Error fetching instructors:", error)
        toast.error("Failed to load instructors")
      } finally {
        setLoading(false)
      }
    }

    fetchInstructors()
  }, [settings.instructorEnabled])

  const fetchInstructors = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/instructors")
      if (!response.ok) {
        throw new Error("Failed to fetch instructors")
      }
      const data = await response.json()
      setInstructors(data.instructors || [])
    } catch (error: any) {
      console.error("Error fetching instructors:", error)
      toast.error("Failed to load instructors")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInstructor = async () => {
    if (!formData.name.trim()) {
      toast.error("Instructor name is required")
      return
    }

    try {
      const response = await fetch("/api/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          image: formData.image.trim() || null,
          bio: formData.bio.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create instructor")
      }

      const data = await response.json()
      toast.success("Instructor created successfully")
      setIsDialogOpen(false)
      setFormData({ name: "", image: "", bio: "" })
      await fetchInstructors()
    } catch (error: any) {
      console.error("Error creating instructor:", error)
      toast.error(error.message || "Failed to create instructor")
    }
  }

  const handleEditInstructor = async () => {
    if (!editingInstructor || !formData.name.trim()) {
      toast.error("Instructor name is required")
      return
    }

    try {
      const response = await fetch(`/api/instructors/${editingInstructor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          image: formData.image.trim() || null,
          bio: formData.bio.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update instructor")
      }

      toast.success("Instructor updated successfully")
      setIsEditDialogOpen(false)
      setEditingInstructor(null)
      setFormData({ name: "", image: "", bio: "" })
      await fetchInstructors()
    } catch (error: any) {
      console.error("Error updating instructor:", error)
      toast.error(error.message || "Failed to update instructor")
    }
  }

  const handleDeleteInstructor = async () => {
    if (!deletingInstructorId) return

    try {
      const response = await fetch(`/api/instructors/${deletingInstructorId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete instructor")
      }

      toast.success("Instructor deleted successfully")
      setDeleteConfirmOpen(false)
      setDeletingInstructorId(null)
      
      // Remove from selected instructors if it was selected
      const updatedIds = settings.instructorIds.filter(id => id !== deletingInstructorId)
      onUpdate({ ...settings, instructorIds: updatedIds })
      
      await fetchInstructors()
    } catch (error: any) {
      console.error("Error deleting instructor:", error)
      toast.error(error.message || "Failed to delete instructor")
    }
  }

  const handleToggleInstructor = (instructorId: string) => {
    const currentIds = settings.instructorIds || []
    const isSelected = currentIds.includes(instructorId)
    
    const updatedIds = isSelected
      ? currentIds.filter(id => id !== instructorId)
      : [...currentIds, instructorId]
    
    onUpdate({ ...settings, instructorIds: updatedIds })
  }

  const openEditDialog = (instructor: Instructor) => {
    setEditingInstructor(instructor)
    setFormData({
      name: instructor.name,
      image: instructor.image || "",
      bio: instructor.bio || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (instructorId: string) => {
    setDeletingInstructorId(instructorId)
    setDeleteConfirmOpen(true)
  }

  const selectedInstructors = instructors.filter(i => settings.instructorIds?.includes(i.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Instructor Settings</Label>
          <p className="text-sm text-muted-foreground">
            Assign custom instructors to this course. If disabled, the course creator will be shown as the instructor.
          </p>
        </div>
        <Switch
          checked={settings.instructorEnabled}
          onCheckedChange={(checked) =>
            onUpdate({ ...settings, instructorEnabled: checked })
          }
        />
      </div>

      {settings.instructorEnabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Instructors</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Instructor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Instructor</DialogTitle>
                    <DialogDescription>
                      Create a new instructor profile. This instructor can be assigned to multiple courses.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Instructor name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image</Label>
                      <FileUpload
                        type="avatar"
                        accept="image/png,image/jpeg,image/jpg"
                        maxSize={2 * 1024 * 1024} // 2MB
                        multiple={false}
                        initialValue={formData.image ? [formData.image] : undefined}
                        onUploadComplete={(files, urls) => {
                          if (urls.length > 0) {
                            setFormData({ ...formData, image: urls[0] })
                          }
                        }}
                        onRemove={() => {
                          setFormData({ ...formData, image: "" })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData({ ...formData, bio: e.target.value })
                        }
                        placeholder="Instructor bio"
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateInstructor}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : instructors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No instructors available. Create one to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {instructors.map((instructor) => {
                  const isSelected = settings.instructorIds?.includes(instructor.id)
                  return (
                    <div
                      key={instructor.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleInstructor(instructor.id)}
                      />
                      {instructor.image ? (
                        <SafeImage
                          src={instructor.image}
                          alt={instructor.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            No image
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{instructor.name}</h4>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(instructor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(instructor.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedInstructors.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium mb-2">
                  Selected Instructors ({selectedInstructors.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedInstructors.map((instructor) => (
                    <div
                      key={instructor.id}
                      className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full"
                    >
                      <span className="text-sm">{instructor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Instructor</DialogTitle>
            <DialogDescription>
              Update the instructor profile information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Instructor name"
              />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <FileUpload
                type="avatar"
                accept="image/png,image/jpeg,image/jpg"
                maxSize={2 * 1024 * 1024} // 2MB
                multiple={false}
                initialValue={formData.image ? [formData.image] : undefined}
                onUploadComplete={(files, urls) => {
                  if (urls.length > 0) {
                    setFormData({ ...formData, image: urls[0] })
                  }
                }}
                onRemove={() => {
                  setFormData({ ...formData, image: "" })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Instructor bio"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingInstructor(null)
                setFormData({ name: "", image: "", bio: "" })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditInstructor}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instructor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this instructor? This action cannot be undone.
              If the instructor is assigned to courses, you'll need to remove them from those courses first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingInstructorId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInstructor}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
