"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  GripVertical,
  Video,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Eye,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
} from "lucide-react"
import LessonContentEditor from "./LessonContentEditor"
import QuizBuilder from "./QuizBuilder"
import ResourceManager from "./ResourceManager"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

import type { Resource } from "./ResourceManager"

interface Lesson {
  id: string
  title: string
  type: "video" | "text" | "mixed"
  content: any
  resources: Resource[]
  settings: {
    isRequired: boolean
  }
  quiz: {
    enabled: boolean
    questions: any[]
  }
  estimatedDuration?: number
}

interface LessonCardProps {
  lesson: Lesson
  index: number
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (lesson: Lesson) => void
  onDelete: (lessonId: string) => void
  onDuplicate: (lesson: Lesson) => void
  dragHandleProps?: any
  minimumQuizScore?: number
  courseId?: string | number
}

export default function LessonCard({
  lesson,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onDuplicate,
  dragHandleProps,
  minimumQuizScore = 50,
  courseId,
}: LessonCardProps) {
  const [localLesson, setLocalLesson] = useState<Lesson>(lesson)

  const updateLesson = (updates: Partial<Lesson>) => {
    const updated = { ...localLesson, ...updates }
    setLocalLesson(updated)
    onUpdate(updated)
  }

  const getLessonStatus = (): "complete" | "incomplete" | "draft" => {
    if (!localLesson.title || localLesson.title.trim() === "") return "draft"
    if (localLesson.type === "video" && !localLesson.content?.url) {
      return "incomplete"
    }
    if (localLesson.type === "text" && !localLesson.content?.text && !localLesson.content?.html) {
      return "incomplete"
    }
    return "complete"
  }

  const status = getLessonStatus()
  const statusConfig = {
    complete: { label: "Complete", icon: CheckCircle2, color: "bg-green-500" },
    incomplete: { label: "Incomplete", icon: Circle, color: "bg-yellow-500" },
    draft: { label: "Draft", icon: Circle, color: "bg-gray-500" },
  }

  const StatusIcon = statusConfig[status].icon


  return (
    <Card className={`border-2 ${isExpanded ? "border-primary" : ""} w-full overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {dragHandleProps && (
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 flex items-center gap-2">
            {localLesson.type === "video" ? (
              <Video className="w-4 h-4 text-muted-foreground" />
            ) : localLesson.type === "text" ? (
              <FileText className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Layers className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-muted-foreground">Lesson {index + 1}</span>
            <Badge variant="secondary" className={`${statusConfig[status].color} text-white text-xs`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[status].label}
            </Badge>
            {localLesson.estimatedDuration && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {localLesson.estimatedDuration} min
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onDuplicate(localLesson)} title="Duplicate">
              <Copy className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this lesson? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(localLesson.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded}>
        <CollapsibleContent className="w-full overflow-hidden">
          <CardContent className="space-y-6 pt-0 w-full overflow-hidden">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lesson Title</Label>
                <Input
                  value={localLesson.title}
                  onChange={(e) => updateLesson({ title: e.target.value })}
                  placeholder="Enter lesson title"
                />
              </div>

              <div className="space-y-2">
                <Label>Lesson Type</Label>
                <RadioGroup
                  value={localLesson.type}
                  onValueChange={(value: "video" | "text" | "mixed") => updateLesson({ type: value })}
                >
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="video" id="lesson-video" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="lesson-video">Video Lesson</Label>
                      <p className="text-sm text-muted-foreground">
                        Lesson content is primarily video-based
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="text" id="lesson-text" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="lesson-text">Text Lesson</Label>
                      <p className="text-sm text-muted-foreground">
                        Lesson content is primarily text-based
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="mixed" id="lesson-mixed" />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="lesson-mixed">Mixed Lesson (Video + Text)</Label>
                      <p className="text-sm text-muted-foreground">
                        Lesson contains both video and text content
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Estimated Duration (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={localLesson.estimatedDuration || 0}
                  onChange={(e) => updateLesson({ estimatedDuration: Number.parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Content */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Content</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <LessonContentEditor
                  type={localLesson.type}
                  content={localLesson.content}
                  onChange={(content) => updateLesson({ content })}
                  courseId={courseId}
                  lessonId={localLesson.id}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Resources */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Resources ({localLesson.resources.length})</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <ResourceManager
                  resources={localLesson.resources}
                  onChange={(resources) => updateLesson({ resources })}
                  lessonId={localLesson.id}
                  courseId={courseId}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Quiz */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Quiz ({localLesson.quiz.questions.length} questions)</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <QuizBuilder
                  quiz={localLesson.quiz}
                  onChange={(quiz) => updateLesson({ quiz })}
                  minimumQuizScore={minimumQuizScore}
                  courseId={courseId}
                  lessonId={localLesson.id}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Settings */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Settings</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Required Lesson</Label>
                      <p className="text-sm text-muted-foreground">Students must complete this lesson to progress</p>
                    </div>
                    <Switch
                      checked={localLesson.settings.isRequired}
                      onCheckedChange={(checked) =>
                        updateLesson({
                          settings: { ...localLesson.settings, isRequired: checked },
                        })
                      }
                    />
                  </div>


                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

