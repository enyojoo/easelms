"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  Youtube, 
  Image as ImageIcon,
  Download,
  Upload,
  Undo,
  Redo,
  Trash2,
  Palette,
  Shapes,
  Brain,
  Users,
  MessageSquare,
  Save
} from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { toast } from "sonner"

interface EnhancedWhiteboardProps {
  sessionId: string
}

interface DrawingAction {
  type: string
  x: number
  y: number
  width?: number
  height?: number
  color: string
  strokeWidth: number
  text?: string
  timestamp: number
}

interface WhiteboardState {
  actions: DrawingAction[]
  currentAction: DrawingAction | null
  isDrawing: boolean
  startX: number
  startY: number
}

export default function EnhancedWhiteboard({ sessionId }: EnhancedWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState("pencil")
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [whiteboardState, setWhiteboardState] = useState<WhiteboardState>({
    actions: [],
    currentAction: null,
    isDrawing: false,
    startX: 0,
    startY: 0
  })
  const [history, setHistory] = useState<DrawingAction[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [collaborators, setCollaborators] = useState([
    { id: 1, name: "Alice", color: "#FF6B6B", isActive: true },
    { id: 2, name: "Bob", color: "#4ECDC4", isActive: false },
    { id: 3, name: "Charlie", color: "#45B7D1", isActive: true }
  ])
  const [showCollaborators, setShowCollaborators] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: "Alice", message: "Great diagram!", timestamp: new Date() },
    { id: 2, user: "Bob", message: "Should we add more details here?", timestamp: new Date() }
  ])

  const colors = [
    "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", 
    "#FF00FF", "#00FFFF", "#FFA500", "#800080", "#008000"
  ]

  const shapes = [
    { name: "Rectangle", icon: Square, tool: "rectangle" },
    { name: "Circle", icon: Circle, tool: "circle" },
    { name: "Arrow", icon: Shapes, tool: "arrow" },
    { name: "Line", icon: Shapes, tool: "line" }
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Redraw all actions
    redrawCanvas(ctx)
  }, [whiteboardState.actions])

  const redrawCanvas = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    
    whiteboardState.actions.forEach(action => {
      drawAction(ctx, action)
    })
  }

  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawingAction) => {
    ctx.strokeStyle = action.color
    ctx.lineWidth = action.strokeWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    switch (action.type) {
      case "pencil":
        // This would be handled by the drawing path
        break
      case "rectangle":
        ctx.strokeRect(action.x, action.y, action.width || 0, action.height || 0)
        break
      case "circle":
        const radius = Math.sqrt((action.width || 0) ** 2 + (action.height || 0) ** 2)
        ctx.beginPath()
        ctx.arc(action.x, action.y, radius, 0, 2 * Math.PI)
        ctx.stroke()
        break
      case "text":
        ctx.font = `${action.strokeWidth * 5}px Arial`
        ctx.fillStyle = action.color
        ctx.fillText(action.text || "", action.x, action.y)
        break
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setStartX(x)
    setStartY(y)

    const newAction: DrawingAction = {
      type: tool,
      x,
      y,
      color: strokeColor,
      strokeWidth,
      timestamp: Date.now()
    }

    setWhiteboardState(prev => ({
      ...prev,
      currentAction: newAction,
      isDrawing: true,
      startX: x,
      startY: y
    }))
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !whiteboardState.currentAction) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === "pencil") {
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(x, y)
      ctx.stroke()
      setStartX(x)
      setStartY(y)
    } else if (tool === "rectangle" || tool === "circle") {
      // Clear and redraw
      redrawCanvas(ctx)
      
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      
      if (tool === "rectangle") {
        ctx.strokeRect(startX, startY, x - startX, y - startY)
      } else if (tool === "circle") {
        const radius = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2)
        ctx.beginPath()
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI)
        ctx.stroke()
      }
    }
  }

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newAction: DrawingAction = {
      ...whiteboardState.currentAction!,
      width: x - startX,
      height: y - startY,
      timestamp: Date.now()
    }

    setWhiteboardState(prev => ({
      ...prev,
      actions: [...prev.actions, newAction],
      currentAction: null,
      isDrawing: false
    }))

    // Add to history
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newAction)
      setHistoryIndex(newHistory.length - 1)
      return newHistory
    })

    setIsDrawing(false)
  }

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setWhiteboardState(prev => ({
        ...prev,
        actions: history.slice(0, newIndex + 1)
      }))
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setWhiteboardState(prev => ({
        ...prev,
        actions: history.slice(0, newIndex + 1)
      }))
    }
  }

  const clearCanvas = () => {
    setWhiteboardState(prev => ({
      ...prev,
      actions: []
    }))
    setHistory([])
    setHistoryIndex(-1)
  }

  const saveWhiteboard = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `whiteboard-${sessionId}-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
    
    toast.success("Whiteboard saved!")
  }

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    setIsGeneratingAI(true)
    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: `Create a visual diagram or concept map for: "${aiPrompt}". 
        Provide specific instructions for drawing this on a whiteboard, including:
        1. Main concepts to draw
        2. Connections between concepts
        3. Layout suggestions
        4. Colors to use
        5. Any text labels needed
        
        Format as a step-by-step drawing guide.`
      })

      // Parse AI response and create drawing instructions
      const instructions = text.split('\n').filter(line => line.trim())
      
      // For now, just show the instructions
      toast.success("AI generated drawing instructions!")
      console.log("AI Drawing Instructions:", instructions)
      
    } catch (error) {
      console.error("Error generating AI content:", error)
      toast.error("Failed to generate AI content")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const addText = () => {
    const text = prompt("Enter text to add:")
    if (text) {
      const newAction: DrawingAction = {
        type: "text",
        x: 100,
        y: 100,
        color: strokeColor,
        strokeWidth,
        text,
        timestamp: Date.now()
      }

      setWhiteboardState(prev => ({
        ...prev,
        actions: [...prev.actions, newAction]
      }))
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          {/* Drawing Tools */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              size="sm"
              variant={tool === "pencil" ? "default" : "ghost"}
              onClick={() => setTool("pencil")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === "eraser" ? "default" : "ghost"}
              onClick={() => setTool("eraser")}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            {shapes.map((shape) => (
              <Button
                key={shape.tool}
                size="sm"
                variant={tool === shape.tool ? "default" : "ghost"}
                onClick={() => setTool(shape.tool)}
              >
                <shape.icon className="h-4 w-4" />
              </Button>
            ))}
            <Button
              size="sm"
              variant={tool === "text" ? "default" : "ghost"}
              onClick={addText}
            >
              <Type className="h-4 w-4" />
            </Button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1">
            {colors.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border-2 ${
                  strokeColor === color ? "border-gray-400" : "border-gray-200"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setStrokeColor(color)}
              />
            ))}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Width:</span>
            <Slider
              value={[strokeWidth]}
              onValueChange={([value]) => setStrokeWidth(value)}
              max={10}
              min={1}
              step={1}
              className="w-20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Assistant */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAIAssistant(!showAIAssistant)}
          >
            <Brain className="h-4 w-4 mr-1" />
            AI Assistant
          </Button>

          {/* Collaboration */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCollaborators(!showCollaborators)}
          >
            <Users className="h-4 w-4 mr-1" />
            {collaborators.filter(c => c.isActive).length}
          </Button>

          {/* Chat */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Chat
          </Button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <Redo className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={clearCanvas}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={saveWhiteboard}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 relative">
        {/* Main Canvas */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={() => setIsDrawing(false)}
          />
        </div>

        {/* AI Assistant Panel */}
        {showAIAssistant && (
          <Card className="absolute right-4 top-4 w-80 z-10">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Drawing Assistant
              </h3>
              <div className="space-y-3">
                <Textarea
                  placeholder="Describe what you want to draw (e.g., 'Create a mind map for project management')"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={generateAIContent} 
                  disabled={isGeneratingAI}
                  className="w-full"
                >
                  {isGeneratingAI ? "Generating..." : "Generate Drawing Guide"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collaborators Panel */}
        {showCollaborators && (
          <Card className="absolute right-4 top-4 w-64 z-10">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Active Collaborators</h3>
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: collaborator.color }}
                    />
                    <span className="text-sm">{collaborator.name}</span>
                    <Badge variant={collaborator.isActive ? "default" : "secondary"} className="text-xs">
                      {collaborator.isActive ? "Active" : "Away"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Panel */}
        {showChat && (
          <Card className="absolute right-4 top-4 w-80 z-10">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Whiteboard Chat</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
                {chatMessages.map((message) => (
                  <div key={message.id} className="text-sm">
                    <span className="font-medium">{message.user}:</span>
                    <span className="ml-2">{message.message}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="flex-1" />
                <Button size="sm">Send</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
