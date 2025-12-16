"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export interface CourseSection {
  id: string
  title: string
  description: string
  order: number
  lessons: string[]
}

interface CourseSectionsProps {
  sections: CourseSection[]
  lessons: Array<{ id: string; title: string }>
  onChange: (sections: CourseSection[]) => void
}

export default function CourseSections({ sections, lessons, onChange }: CourseSectionsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const addSection = () => {
    const newSection: CourseSection = {
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "New Section",
      description: "",
      order: sections.length,
      lessons: [],
    }
    onChange([...sections, newSection])
    setExpandedSections(new Set([...expandedSections, newSection.id]))
  }

  const updateSection = (sectionId: string, updates: Partial<CourseSection>) => {
    onChange(sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)))
  }

  const deleteSection = (sectionId: string) => {
    onChange(sections.filter((s) => s.id !== sectionId))
    const newExpanded = new Set(expandedSections)
    newExpanded.delete(sectionId)
    setExpandedSections(newExpanded)
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const addLessonToSection = (sectionId: string, lessonId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (section && !section.lessons.includes(lessonId)) {
      updateSection(sectionId, {
        lessons: [...section.lessons, lessonId],
      })
    }
  }

  const removeLessonFromSection = (sectionId: string, lessonId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (section) {
      updateSection(sectionId, {
        lessons: section.lessons.filter((id) => id !== lessonId),
      })
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const items = Array.from(sections)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    onChange(items.map((item, index) => ({ ...item, order: index })))
  }

  const unassignedLessons = lessons.filter(
    (lesson) => !sections.some((section) => section.lessons.includes(lesson.id))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Course Sections</Label>
          <p className="text-sm text-muted-foreground">
            Organize lessons into sections or modules for better structure
          </p>
        </div>
        <Button onClick={addSection}>
          <Plus className="w-4 h-4 mr-2" /> Add Section
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {sections.map((section, index) => (
                <Draggable key={section.id} draggableId={section.id} index={index}>
                  {(provided) => (
                    <Card ref={provided.innerRef} {...provided.draggableProps} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            </div>
                            <CardTitle className="text-base">{section.title || "Untitled Section"}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {section.lessons.length} {section.lessons.length === 1 ? "lesson" : "lessons"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSection(section.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleSection(section.id)}
                            >
                              {expandedSections.has(section.id) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <Collapsible open={expandedSections.has(section.id)}>
                        <CollapsibleContent>
                          <CardContent className="space-y-4 pt-0">
                            <div className="space-y-2">
                              <Label>Section Title</Label>
                              <Input
                                value={section.title}
                                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                placeholder="Enter section title"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                value={section.description}
                                onChange={(e) => updateSection(section.id, { description: e.target.value })}
                                placeholder="Describe what this section covers..."
                                rows={3}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Lessons in this Section</Label>
                              <div className="space-y-2">
                                {section.lessons.map((lessonId) => {
                                  const lesson = lessons.find((l) => l.id === lessonId)
                                  return lesson ? (
                                    <div
                                      key={lessonId}
                                      className="flex items-center justify-between p-2 bg-muted rounded"
                                    >
                                      <span className="text-sm">{lesson.title}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeLessonFromSection(section.id, lessonId)}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  ) : null
                                })}
                              </div>
                              {unassignedLessons.length > 0 && (
                                <div className="space-y-1">
                                  <Label className="text-xs">Add Lesson</Label>
                                  <select
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        addLessonToSection(section.id, e.target.value)
                                        e.target.value = ""
                                      }
                                    }}
                                  >
                                    <option value="">Select a lesson...</option>
                                    {unassignedLessons.map((lesson) => (
                                      <option key={lesson.id} value={lesson.id}>
                                        {lesson.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {sections.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No sections created yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sections help organize your course content into logical groups
          </p>
        </Card>
      )}
    </div>
  )
}

