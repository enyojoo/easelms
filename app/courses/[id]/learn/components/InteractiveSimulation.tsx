"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Lightbulb, 
  Target,
  Move,
  Trash2,
  Plus,
  Eye,
  EyeOff
} from "lucide-react"
import { toast } from "sonner"

interface InteractiveSimulationProps {
  type: "drag-drop" | "matching" | "sorting" | "flowchart" | "timeline"
  title: string
  description: string
  items: SimulationItem[]
  correctOrder?: string[]
  onComplete?: (score: number) => void
}

interface SimulationItem {
  id: string
  content: string
  type: "item" | "target" | "connector"
  category?: string
  position?: { x: number; y: number }
  isCorrect?: boolean
  isDragging?: boolean
}

interface DragState {
  draggedItem: SimulationItem | null
  dragOffset: { x: number; y: number }
  targetZone: string | null
}

export default function InteractiveSimulation({ 
  type, 
  title, 
  description, 
  items, 
  correctOrder = [],
  onComplete 
}: InteractiveSimulationProps) {
  const [simulationItems, setSimulationItems] = useState<SimulationItem[]>(items)
  const [dragState, setDragState] = useState<DragState>({
    draggedItem: null,
    dragOffset: { x: 0, y: 0 },
    targetZone: null
  })
  const [score, setScore] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [timeSpent, setTimeSpent] = useState(0)
  const [showAnswers, setShowAnswers] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const hints = {
    "drag-drop": "Drag items to their correct positions. Look for visual cues and logical relationships.",
    "matching": "Match items from the left column with their corresponding items on the right.",
    "sorting": "Arrange items in the correct order. Consider chronological, logical, or hierarchical relationships.",
    "flowchart": "Connect the flowchart elements in the proper sequence to show the process flow.",
    "timeline": "Place events in chronological order from earliest to latest."
  }

  const handleDragStart = useCallback((e: React.DragEvent, item: SimulationItem) => {
    setDragState({
      draggedItem: item,
      dragOffset: {
        x: e.clientX - (item.position?.x || 0),
        y: e.clientY - (item.position?.y || 0)
      },
      targetZone: null
    })

    setSimulationItems(prev => 
      prev.map(i => i.id === item.id ? { ...i, isDragging: true } : i)
    )
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    if (!dragState.draggedItem) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find target zone
    const targetZone = findTargetZone(x, y)
    setDragState(prev => ({ ...prev, targetZone }))
  }, [dragState.draggedItem])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    if (!dragState.draggedItem) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setSimulationItems(prev => 
      prev.map(item => 
        item.id === dragState.draggedItem!.id 
          ? { 
              ...item, 
              position: { x, y },
              isDragging: false,
              isCorrect: checkCorrectness(item, x, y)
            }
          : item
      )
    )

    setDragState({
      draggedItem: null,
      dragOffset: { x: 0, y: 0 },
      targetZone: null
    })

    checkCompletion()
  }, [dragState])

  const findTargetZone = (x: number, y: number): string | null => {
    // Simple target zone detection (in real app, this would be more sophisticated)
    if (x > 200 && x < 400 && y > 100 && y < 300) {
      return "main-area"
    }
    return null
  }

  const checkCorrectness = (item: SimulationItem, x: number, y: number): boolean => {
    // Simple correctness check (in real app, this would be more sophisticated)
    if (type === "sorting") {
      const itemIndex = simulationItems.findIndex(i => i.id === item.id)
      const correctIndex = correctOrder.indexOf(item.id)
      return itemIndex === correctIndex
    }
    
    if (type === "drag-drop") {
      return x > 200 && x < 400 && y > 100 && y < 300
    }

    return true
  }

  const checkCompletion = () => {
    const correctItems = simulationItems.filter(item => item.isCorrect)
    const newScore = Math.round((correctItems.length / simulationItems.length) * 100)
    
    setScore(newScore)
    setAttempts(prev => prev + 1)

    if (newScore === 100) {
      setIsCompleted(true)
      onComplete?.(newScore)
      toast.success("Perfect! Simulation completed successfully! 🎉")
    } else if (newScore >= 80) {
      toast.success("Great job! Almost there!")
    } else if (newScore >= 60) {
      toast.info("Good progress! Keep trying!")
    } else {
      toast.error("Try again! You can do it!")
    }
  }

  const resetSimulation = () => {
    setSimulationItems(items)
    setScore(0)
    setIsCompleted(false)
    setAttempts(0)
    setTimeSpent(0)
    setShowAnswers(false)
    toast.info("Simulation reset")
  }

  const showAnswer = () => {
    setShowAnswers(true)
    toast.info("Answers revealed! Study the correct arrangement.")
  }

  const renderDragDropSimulation = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Source Area */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Drag from here</h3>
          <div className="space-y-2">
            {simulationItems
              .filter(item => item.type === "item")
              .map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className={`p-3 border rounded-lg cursor-move hover:bg-gray-50 ${
                    item.isDragging ? "opacity-50" : ""
                  } ${item.isCorrect ? "border-green-500 bg-green-50" : ""}`}
                >
                  {item.content}
                </div>
              ))}
          </div>
        </Card>

        {/* Target Area */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Drop here</h3>
          <div 
            ref={containerRef}
            className="min-h-48 border-2 border-dashed border-gray-300 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {simulationItems
              .filter(item => item.type === "target" || item.position)
              .map(item => (
                <div
                  key={item.id}
                  className={`absolute p-2 border rounded ${
                    item.isCorrect ? "border-green-500 bg-green-50" : "border-gray-300"
                  }`}
                  style={{
                    left: item.position?.x || 0,
                    top: item.position?.y || 0
                  }}
                >
                  {item.content}
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  )

  const renderMatchingSimulation = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-3">
          <h3 className="font-semibold">Items</h3>
          {simulationItems
            .filter(item => item.type === "item")
            .map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className="p-3 border rounded-lg cursor-move hover:bg-gray-50"
              >
                {item.content}
              </div>
            ))}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <h3 className="font-semibold">Matches</h3>
          {simulationItems
            .filter(item => item.type === "target")
            .map(item => (
              <div
                key={item.id}
                className="p-3 border-2 border-dashed border-gray-300 rounded-lg min-h-12 flex items-center"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {item.content}
              </div>
            ))}
        </div>
      </div>
    </div>
  )

  const renderSortingSimulation = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="font-semibold">Arrange in correct order</h3>
        <div className="space-y-2">
          {simulationItems.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              className={`p-3 border rounded-lg cursor-move hover:bg-gray-50 ${
                item.isCorrect ? "border-green-500 bg-green-50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span>{item.content}</span>
                {item.isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderSimulation = () => {
    switch (type) {
      case "drag-drop":
        return renderDragDropSimulation()
      case "matching":
        return renderMatchingSimulation()
      case "sorting":
        return renderSortingSimulation()
      default:
        return <div>Simulation type not supported</div>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isCompleted ? "default" : "secondary"}>
              {isCompleted ? "Completed" : "In Progress"}
            </Badge>
            <Badge variant="outline">{score}%</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{score}%</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHints(!showHints)}
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              Hints
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={showAnswer}
              disabled={isCompleted}
            >
              <Eye className="h-4 w-4 mr-1" />
              Show Answer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetSimulation}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Attempts: {attempts}</span>
            <span>Time: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Hints */}
        {showHints && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800">Hint</h4>
                  <p className="text-sm text-yellow-700 mt-1">{hints[type]}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simulation */}
        <div className="min-h-64">
          {renderSimulation()}
        </div>

        {/* Completion Message */}
        {isCompleted && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">Congratulations!</h4>
                  <p className="text-sm text-green-700">
                    You completed the simulation with a perfect score! Great job!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
