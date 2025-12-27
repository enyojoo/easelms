"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Plus } from "lucide-react"
import LessonCard from "./LessonCard"
import BulkOperations from "./BulkOperations"

interface Resource {
  id: string
  type: "document" | "link"
  title: string
  url: string
}

interface Question {
  id: string
  text: string
  options: string[]
  correctOption: number
}

export interface Lesson {
  id: string
  title: string
  type: "video" | "text"
  content: any
  resources: Resource[]
  settings: {
    isRequired: boolean
    videoProgression: boolean
  }
  quiz: {
    enabled: boolean
    questions: Question[]
  }
  estimatedDuration?: number
}

interface LessonBuilderProps {
  lessons: Lesson[]
  onUpdate: (lessons: Lesson[]) => void
  minimumQuizScore?: number
}

export default function LessonBuilder({ lessons, onUpdate, minimumQuizScore = 50 }: LessonBuilderProps) {
  const [localLessons, setLocalLessons] = useState<Lesson[]>(lessons)
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLocalLessons(lessons)
  }, [lessons])

  const addNewLesson = () => {
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "New Lesson",
      type: "video",
      content: {},
      resources: [],
      settings: {
        isRequired: true,
        videoProgression: true,
      },
      quiz: {
        enabled: false,
        questions: [],
      },
      estimatedDuration: 0,
    }
    const updatedLessons = [...localLessons, newLesson]
    setLocalLessons(updatedLessons)
    onUpdate(updatedLessons)
    // Auto-expand new lesson
    setExpandedLessons(new Set([...expandedLessons, newLesson.id]))
  }

  const updateLesson = (updatedLesson: Lesson) => {
    const updatedLessons = localLessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson))
    setLocalLessons(updatedLessons)
    onUpdate(updatedLessons)
  }

  const deleteLesson = (lessonId: string) => {
    const updatedLessons = localLessons.filter((lesson) => lesson.id !== lessonId)
    setLocalLessons(updatedLessons)
    onUpdate(updatedLessons)
    const newExpanded = new Set(expandedLessons)
    newExpanded.delete(lessonId)
    setExpandedLessons(newExpanded)
  }

  const duplicateLesson = (lesson: Lesson) => {
    const duplicatedLesson: Lesson = {
      ...lesson,
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${lesson.title} (Copy)`,
      resources: lesson.resources.map((r) => ({
        ...r,
        id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
      quiz: {
        ...lesson.quiz,
        questions: lesson.quiz.questions.map((q) => ({
          ...q,
          id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        })),
      },
    }
    const updatedLessons = [...localLessons, duplicatedLesson]
    setLocalLessons(updatedLessons)
    onUpdate(updatedLessons)
    setExpandedLessons(new Set([...expandedLessons, duplicatedLesson.id]))
  }

  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessons((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId)
      } else {
        newSet.add(lessonId)
      }
      return newSet
    })
  }

  const selectAllLessons = () => {
    if (selectedLessons.size === localLessons.length) {
      setSelectedLessons(new Set())
    } else {
      setSelectedLessons(new Set(localLessons.map((l) => l.id)))
    }
  }

  const bulkDelete = () => {
    const updatedLessons = localLessons.filter((lesson) => !selectedLessons.has(lesson.id))
    setLocalLessons(updatedLessons)
    onUpdate(updatedLessons)
    setSelectedLessons(new Set())
  }

  const bulkDuplicate = () => {
    const lessonsToDuplicate = localLessons.filter((lesson) => selectedLessons.has(lesson.id))
    const duplicatedLessons = lessonsToDuplicate.map((lesson) => ({
      ...lesson,
      id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${lesson.title} (Copy)`,
      resources: lesson.resources.map((r) => ({
        ...r,
        id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
      quiz: {
        ...lesson.quiz,
        questions: lesson.quiz.questions.map((q) => ({
          ...q,
          id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        })),
      },
    }))
    const updatedLessons = [...localLessons, ...duplicatedLessons]
    setLocalLessons(updatedLessons)
    onUpdate(updatedLessons)
    setSelectedLessons(new Set())
  }

  const toggleLesson = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons)
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId)
    } else {
      newExpanded.add(lessonId)
    }
    setExpandedLessons(newExpanded)
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(localLessons)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setLocalLessons(items)
    onUpdate(items)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Course Lessons</h2>
        <Button onClick={addNewLesson}>
          <Plus className="w-4 h-4 mr-2" /> Add Lesson
        </Button>
      </div>

      {selectedLessons.size > 0 && (
        <BulkOperations
          selectedItems={Array.from(selectedLessons)}
          onBulkDelete={bulkDelete}
          onBulkDuplicate={bulkDuplicate}
          onSelectAll={selectAllLessons}
          totalItems={localLessons.length}
        />
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="lessons">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {localLessons.map((lesson, index) => (
                <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedLessons.has(lesson.id)}
                        onCheckedChange={() => toggleLessonSelection(lesson.id)}
                        className="mt-4"
                      />
                      <div className="flex-1">
                        <LessonCard
                          lesson={lesson}
                          index={index}
                          isExpanded={expandedLessons.has(lesson.id)}
                          onToggle={() => toggleLesson(lesson.id)}
                          onUpdate={updateLesson}
                          onDelete={deleteLesson}
                          onDuplicate={duplicateLesson}
                          dragHandleProps={provided.dragHandleProps}
                          minimumQuizScore={minimumQuizScore}
                        />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}
