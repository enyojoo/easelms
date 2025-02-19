"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface User {
  id: string
  name: string
}

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
  learners: User[]
  onSendMessage: (recipientId: string, message: string) => void
}

const NewMessageModal: React.FC<NewMessageModalProps> = ({ isOpen, onClose, learners, onSendMessage }) => {
  const [selectedRecipient, setSelectedRecipient] = useState("")
  const [message, setMessage] = useState("")

  const handleSendMessage = () => {
    if (selectedRecipient && message.trim()) {
      onSendMessage(selectedRecipient, message)
      setSelectedRecipient("")
      setMessage("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select onValueChange={setSelectedRecipient} value={selectedRecipient}>
            <SelectTrigger>
              <SelectValue placeholder="Select recipient" />
            </SelectTrigger>
            <SelectContent>
              {learners.map((learner) => (
                <SelectItem key={learner.id} value={learner.id}>
                  {learner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <Button onClick={handleSendMessage}>Send Message</Button>
      </DialogContent>
    </Dialog>
  )
}

export default NewMessageModal

