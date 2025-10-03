"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Pencil, Eraser, Square, Circle, Type, Youtube } from "lucide-react"
import { io, type Socket } from "socket.io-client"
import { useTheme } from "@/app/components/ThemeProvider"
import { Sun, Moon } from "lucide-react"

interface WhiteboardProps {
  sessionId: string
}

interface Point {
  x: number
  y: number
}

interface DrawEvent {
  type: "draw" | "erase" | "rectangle" | "circle" | "text"
  x: number
  y: number
  color?: string
  width?: number
  height?: number
  text?: string
  textColor?: string
}

export default function Whiteboard({ sessionId }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<"pencil" | "eraser" | "rectangle" | "circle" | "text">("pencil")
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [fillColor, setFillColor] = useState("#000000")
  const [textColor, setTextColor] = useState("#000000")
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [textToDraw, setTextToDraw] = useState("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const { theme, setTheme } = useTheme()
  const [drawingColor, setDrawingColor] = useState("#000000")

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const context = canvas.getContext("2d")
      if (context) {
        setCtx(context)
        context.strokeStyle = strokeColor
        context.fillStyle = fillColor
        context.lineWidth = 2
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
        // Set the initial background color based on the theme
        setDrawingColor(theme === "dark" ? "white" : "black")
      }
    }
  }, [theme])

  useEffect(() => {
    if (ctx) {
      ctx.strokeStyle = strokeColor
      ctx.fillStyle = fillColor
    }
  }, [strokeColor, fillColor, ctx])

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io("http://localhost:3001")
    setSocket(newSocket)

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server")
      newSocket.emit("join", sessionId)
    })

    newSocket.on("draw", (drawEvent: DrawEvent) => {
      if (ctx) {
        ctx.strokeStyle = drawEvent.color || strokeColor
        ctx.strokeStyle = theme === "dark" ? "white" : "black"
        ctx.fillStyle = drawEvent.color || fillColor
        ctx.lineWidth = 2

        switch (drawEvent.type) {
          case "draw":
            ctx.lineTo(drawEvent.x, drawEvent.y)
            ctx.stroke()
            break
          case "erase":
            ctx.clearRect(drawEvent.x - 10, drawEvent.y - 10, 20, 20)
            break
          case "rectangle":
            ctx.fillRect(drawEvent.x, drawEvent.y, drawEvent.width || 0, drawEvent.height || 0)
            break
          case "circle":
            ctx.beginPath()
            ctx.arc(drawEvent.x, drawEvent.y, drawEvent.width || 0, 0, 2 * Math.PI)
            ctx.fill()
            break
          case "text":
            ctx.font = "16px sans-serif"
            ctx.fillStyle = drawEvent.textColor || textColor
            ctx.fillText(drawEvent.text || "", drawEvent.x, drawEvent.y)
            break
        }
      }
    })

    return () => {
      newSocket.disconnect()
    }
  }, [sessionId, ctx, strokeColor, fillColor, tool, textColor])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return

    const x = e.nativeEvent.offsetX
    const y = e.nativeEvent.offsetY

    ctx.strokeStyle = theme === "dark" ? "white" : "black"
    setStartX(x)
    setStartY(y)
    setIsDrawing(true)

    if (tool === "text") {
      const text = prompt("Enter text to draw:", "")
      if (text) {
        socket?.emit("draw", { type: "text", x, y, text, textColor })
        setTextToDraw("")
      }
      setIsDrawing(false)
    } else if (tool === "pencil" || tool === "eraser") {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || !socket) return

    const x = e.nativeEvent.offsetX
    const y = e.nativeEvent.offsetY

    ctx.strokeStyle = theme === "dark" ? "white" : "black"
    if (tool === "pencil") {
      ctx.lineTo(x, y)
      ctx.stroke()
      socket.emit("draw", { type: "draw", x, y, color: strokeColor })
    } else if (tool === "eraser") {
      ctx.clearRect(x - 10, y - 10, 20, 20)
      socket.emit("draw", { type: "erase", x, y })
    } else if (tool === "rectangle" || tool === "circle") {
      const width = x - startX
      const height = y - startY
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
      if (tool === "rectangle") {
        ctx.fillRect(startX, startY, width, height)
      } else {
        const radius = Math.abs(width)
        ctx.beginPath()
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || !socket) return
    setIsDrawing(false)

    if (tool === "rectangle" || tool === "circle") {
      const x = e.nativeEvent.offsetX
      const y = e.nativeEvent.offsetY
      const width = x - startX
      const height = y - startY
      socket.emit("draw", { type: tool, x: startX, y: startY, width, height, color: strokeColor })
    }
  }

  const handleYouTube = () => {
    // Placeholder for YouTube integration
    console.log("YouTube integration to be implemented")
    // Here you would typically open a dialog to input a YouTube URL
    // and then embed the video in the whiteboard
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="space-x-2">
          <Button variant={tool === "pencil" ? "default" : "outline"} size="icon" onClick={() => setTool("pencil")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant={tool === "eraser" ? "default" : "outline"} size="icon" onClick={() => setTool("eraser")}>
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "rectangle" ? "default" : "outline"}
            size="icon"
            onClick={() => setTool("rectangle")}
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button variant={tool === "circle" ? "default" : "outline"} size="icon" onClick={() => setTool("circle")}>
            <Circle className="h-4 w-4" />
          </Button>
          <Button variant={tool === "text" ? "default" : "outline"} size="icon" onClick={() => setTool("text")}>
            <Type className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleYouTube()}>
            <Youtube className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="icon" variant="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="border border-border rounded-lg flex-grow w-full bg-white dark:bg-black"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    </div>
  )
}
