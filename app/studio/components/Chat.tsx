"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Message {
  id: string
  sender: string
  content: string
  timestamp: Date
}

interface ChatProps {
  sessionId: string
}

export default function Chat({ sessionId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")

  // Mock function to simulate receiving messages
  useEffect(() => {
    const interval = setInterval(() => {
      const mockMessage: Message = {
        id: Date.now().toString(),
        sender: "System",
        content: "This is a mock message.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, mockMessage])
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      sender: "You",
      content: newMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow mb-4 mt-2">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start space-x-2 mb-4">
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=40&width=40" />
              <AvatarFallback>{message.sender[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{message.sender}</p>
              <p>{message.content}</p>
              <p className="text-xs text-muted-foreground">{message.timestamp.toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
      </ScrollArea>
      <form onSubmit={sendMessage} className="flex space-x-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  )
}
