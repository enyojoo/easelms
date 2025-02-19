"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Plus, GripVertical, Video, FileText, Settings, Trash2, Link, FileUp } from "lucide-react"
import LessonContentEditor from "./LessonContentEditor"

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

interface Lesson {
  id: string
  title: string
  type: "video" | "text"
  content: any
  resources: Resource[]
  settings: {
    isRequired: boolean
    videoProgression: boolean
    allowSkip: boolean
    timeLimit: number
  }
  quiz: {
    enabled: boolean
    passingScore: number
    questions: Question[]
  }
}

interface LessonBuilderProps {
  lessons: Lesson[]
  onUpdate: (lessons: Lesson[]) => void
}

export default function LessonBuilder({ lessons, onUpdate }: LessonBuilderProps) {
  const [localLessons, setLocalLessons] = useState<Lesson[]>(lessons)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isEditing, setIsEditing] = useState(false)

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
        allowSkip: false,
        timeLimit: 0,
      },
      quiz: {
        enabled: false,
        passingScore: 70,
        questions: [],
      },
    }
    const updatedLessons = [...localLessons, newLesson]
    setLocalLessons(updatedLessons)
    onUpdate(updatedLessons)
  }

  const addQuestion = (lesson: Lesson) => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: "",
      options: ["", "", "", ""],
      correctOption: 0,
    }

    const updatedLesson = {
      ...lesson,
      quiz: {
        ...lesson.quiz,
        questions: [...(lesson.quiz.questions || []), newQuestion],
      },
    }

    updateLesson(updatedLesson)
  }

  const removeQuestion = (lessonId: string, questionId: string) => {
    const lesson = localLessons.find((l) => l.id === lessonId)
    if (!lesson) return

    const updatedLesson = {
      ...lesson,
      quiz: {
        ...lesson.quiz,
        questions: lesson.quiz.questions.filter((q) => q.id !== questionId),
      },
    }

    updateLesson(updatedLesson)
  }

  const addResource = (lesson: Lesson, type: "document" | "link") => {
    const newResource: Resource = {
      id: `resource-${Date.now()}`,
      type,
      title: "",
      url: "",
    }

    const updatedLesson = {
      ...lesson,
      resources: [...lesson.resources, newResource],
    }

    updateLesson(updatedLesson)
  }

  const removeResource = (lessonId: string, resourceId: string) => {
    const lesson = localLessons.find((l) => l.id === lessonId)
    if (!lesson) return

    const updatedLesson = {
      ...lesson,
      resources: lesson.resources.filter((r) => r.id !== resourceId),
    }

    updateLesson(updatedLesson)
  }

  const updateLesson = (updatedLesson: Lesson) => {
    const updatedLessons = localLessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson))
    setLocalLessons(updatedLessons)
    onUpdate(updatedLessons)
    setSelectedLesson(updatedLesson)
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(localLessons)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setLocalLessons(items)
    onUpdate(items)
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />
      case "text":
        return <FileText className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Course Lessons</h2>
        <Button onClick={addNewLesson}>
          <Plus className="w-4 h-4 mr-2" /> Add Lesson
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="lessons">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {localLessons.map((lesson, index) => (
                    <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-3 rounded-lg border ${
                            selectedLesson?.id === lesson.id ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            {getLessonIcon(lesson.type)}
                            <span className="flex-grow truncate">{lesson.title}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLesson(lesson)
                                setIsEditing(true)
                              }}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
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

        <div className="md:col-span-2">
          {isEditing && selectedLesson && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Lesson</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="lessonTitle">Lesson Title</Label>
                  <Input
                    id="lessonTitle"
                    value={selectedLesson.title}
                    onChange={(e) => updateLesson({ ...selectedLesson, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lessonType">Lesson Type</Label>
                  <Select
                    value={selectedLesson.type}
                    onValueChange={(value: "video" | "text") => updateLesson({ ...selectedLesson, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lesson type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video Lesson</SelectItem>
                      <SelectItem value="text">Text Lesson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <LessonContentEditor
                  type={selectedLesson.type}
                  content={selectedLesson.content}
                  onChange={(content) => updateLesson({ ...selectedLesson, content })}
                />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Resources</h3>
                  {selectedLesson.resources.map((resource) => (
                    <div key={resource.id} className="flex items-center space-x-2">
                      {resource.type === "document" ? <FileUp className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                      <Input
                        value={resource.title}
                        onChange={(e) => {
                          const updatedResources = selectedLesson.resources.map((r) =>
                            r.id === resource.id ? { ...r, title: e.target.value } : r,
                          )
                          updateLesson({ ...selectedLesson, resources: updatedResources })
                        }}
                        placeholder="Resource title"
                      />
                      <Input
                        value={resource.url}
                        onChange={(e) => {
                          const updatedResources = selectedLesson.resources.map((r) =>
                            r.id === resource.id ? { ...r, url: e.target.value } : r,
                          )
                          updateLesson({ ...selectedLesson, resources: updatedResources })
                        }}
                        placeholder={resource.type === "document" ? "Upload file" : "Enter URL"}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeResource(selectedLesson.id, resource.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex space-x-2">
                    <Button onClick={() => addResource(selectedLesson, "document")}>
                      <FileUp className="w-4 h-4 mr-2" /> Add File
                    </Button>
                    <Button onClick={() => addResource(selectedLesson, "link")}>
                      <Link className="w-4 h-4 mr-2" /> Add Link
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Quiz</Label>
                      <p className="text-sm text-muted-foreground">Enable quiz for this lesson</p>
                    </div>
                    <Switch
                      checked={selectedLesson.quiz.enabled}
                      onCheckedChange={(checked) =>
                        updateLesson({
                          ...selectedLesson,
                          quiz: { ...selectedLesson.quiz, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {selectedLesson.quiz.enabled && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Passing Score (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={selectedLesson.quiz.passingScore}
                          onChange={(e) =>
                            updateLesson({
                              ...selectedLesson,
                              quiz: {
                                ...selectedLesson.quiz,
                                passingScore: Number.parseInt(e.target.value),
                              },
                            })
                          }
                        />
                      </div>

                      <Button onClick={() => addQuestion(selectedLesson)} className="w-full" type="button">
                        <Plus className="w-4 h-4 mr-2" /> Add Question
                      </Button>

                      {selectedLesson.quiz.questions.map((question, qIndex) => (
                        <div key={question.id} className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Question {qIndex + 1}</Label>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeQuestion(selectedLesson.id, question.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <Input
                            value={question.text}
                            onChange={(e) => {
                              const updatedQuestions = [...selectedLesson.quiz.questions]
                              updatedQuestions[qIndex] = {
                                ...question,
                                text: e.target.value,
                              }
                              updateLesson({
                                ...selectedLesson,
                                quiz: {
                                  ...selectedLesson.quiz,
                                  questions: updatedQuestions,
                                },
                              })
                            }}
                            placeholder="Enter question text"
                          />

                          <RadioGroup
                            value={question.correctOption.toString()}
                            onValueChange={(value) => {
                              const updatedQuestions = [...selectedLesson.quiz.questions]
                              updatedQuestions[qIndex] = {
                                ...question,
                                correctOption: Number.parseInt(value),
                              }
                              updateLesson({
                                ...selectedLesson,
                                quiz: {
                                  ...selectedLesson.quiz,
                                  questions: updatedQuestions,
                                },
                              })
                            }}
                          >
                            {question.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center space-x-2">
                                <RadioGroupItem value={oIndex.toString()} />
                                <Input
                                  value={option}
                                  onChange={(e) => {
                                    const updatedQuestions = [...selectedLesson.quiz.questions]
                                    const newOptions = [...question.options]
                                    newOptions[oIndex] = e.target.value
                                    updatedQuestions[qIndex] = {
                                      ...question,
                                      options: newOptions,
                                    }
                                    updateLesson({
                                      ...selectedLesson,
                                      quiz: {
                                        ...selectedLesson.quiz,
                                        questions: updatedQuestions,
                                      },
                                    })
                                  }}
                                  placeholder={`Option ${oIndex + 1}`}
                                  className="flex-grow"
                                />
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Lesson Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Required Lesson</Label>
                        <p className="text-sm text-muted-foreground">Students must complete this lesson to progress</p>
                      </div>
                      <Switch
                        checked={selectedLesson.settings.isRequired}
                        onCheckedChange={(checked) =>
                          updateLesson({
                            ...selectedLesson,
                            settings: { ...selectedLesson.settings, isRequired: checked },
                          })
                        }
                      />
                    </div>

                    {selectedLesson.type === "video" && (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Video Progress Tracking</Label>
                          <p className="text-sm text-muted-foreground">Track student's video watching progress</p>
                        </div>
                        <Switch
                          checked={selectedLesson.settings.videoProgression}
                          onCheckedChange={(checked) =>
                            updateLesson({
                              ...selectedLesson,
                              settings: {
                                ...selectedLesson.settings,
                                videoProgression: checked,
                              },
                            })
                          }
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Skip</Label>
                        <p className="text-sm text-muted-foreground">Allow students to skip this lesson</p>
                      </div>
                      <Switch
                        checked={selectedLesson.settings.allowSkip}
                        onCheckedChange={(checked) =>
                          updateLesson({
                            ...selectedLesson,
                            settings: { ...selectedLesson.settings, allowSkip: checked },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Time Limit (minutes)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={selectedLesson.settings.timeLimit}
                        onChange={(e) =>
                          updateLesson({
                            ...selectedLesson,
                            settings: {
                              ...selectedLesson.settings,
                              timeLimit: Number.parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedLesson(null)
                      setIsEditing(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      updateLesson(selectedLesson)
                      setSelectedLesson(null)
                      setIsEditing(false)
                    }}
                  >
                    Save Lesson
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

