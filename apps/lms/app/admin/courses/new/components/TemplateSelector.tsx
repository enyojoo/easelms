"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, X, FileText, Plus } from "lucide-react"
import { useCourseTemplates } from "../hooks/useCourseTemplates"

interface TemplateSelectorProps {
  onSelect: (template: any) => void
  trigger?: React.ReactNode
}

export default function TemplateSelector({ onSelect, trigger }: TemplateSelectorProps) {
  const { templates, deleteTemplate, getTemplates, getCategories } = useCourseTemplates()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const categories = getCategories()

  const filteredTemplates = useMemo(() => {
    return getTemplates({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      search: search || undefined,
    })
  }, [templates, selectedCategory, search, getTemplates])

  const handleSelect = (template: any) => {
    // Deep clone the course data to avoid mutations
    const courseData = JSON.parse(JSON.stringify(template.courseData))
    // Reset IDs to generate new ones
    courseData.lessons = courseData.lessons?.map((lesson: any) => ({
      ...lesson,
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }))
    onSelect(courseData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" /> Use Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Course Templates</DialogTitle>
          <DialogDescription>
            Select a template to start creating your course
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filters */}
          <div className="space-y-3 border-b pb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No templates found</p>
                <p className="text-sm mt-1">Create a template by saving a course as a template</p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          {template.category && (
                            <Badge variant="outline">{template.category}</Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {template.courseData.lessons?.length || 0} lessons • Created{" "}
                          {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTemplate(template.id)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

