"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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

const MessageThreadModal: React.FC<MessageThreadModalProps> = ({
  isOpen,
  onClose,
  messages,
  onSendReply,
  instructorName,
}) => {
  const [reply, setReply] = useState("")

  const handleSendReply = () => {
    if (reply.trim()) {
      onSendReply(reply)
      setReply("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Conversation with {instructorName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] w-full pr-4">
          {messages.map((message) => (
            <div key={message.id} className="mb-4">
              <p className="font-semibold">{message.sender}</p>
              <p>{message.content}</p>
              <p className="text-sm text-muted-foreground">{message.timestamp}</p>
            </div>
          ))}
        </ScrollArea>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Type your reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendReply()}
          />
          <Button onClick={handleSendReply}>Send</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MessageThreadModal

