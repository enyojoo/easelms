"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
}

interface MessageThreadModalProps {
  isOpen: boolean
  onClose: () => void
  messages: Message[]
  onSendReply: (reply: string) => void
  instructorName: string
}

export default function MessageThreadModal({
  isOpen,
  onClose,
  messages,
  onSendReply,
  instructorName,
}: MessageThreadModalProps) {
  const [reply, setReply] = useState("")

  const handleSendReply = () => {
    onSendReply(reply)
    setReply("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Message Thread</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {messages.map((message) => (
            <div key={message.id} className="mb-4 p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">
                  {message.sender === "Instructor" ? instructorName : message.sender}
                </span>
                <span className="text-sm text-muted-foreground">{message.timestamp}</span>
              </div>
              <p>{message.content}</p>
            </div>
          ))}
        </ScrollArea>
        <div className="mt-4">
          <Textarea
            placeholder="Type your reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="mb-4"
          />
          <Button onClick={handleSendReply}>Send Reply</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

