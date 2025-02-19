"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface Student {
  id: string
  name: string
}

interface NewMessageModalProps {
  isOpen: boolean
  onClose: () => void
  learners: Student[]
  onSendMessage: (recipientId: string, message: string) => void
}

export default function NewMessageModal({ isOpen, onClose, learners, onSendMessage }: NewMessageModalProps) {
  const [selectedRecipient, setSelectedRecipient] = useState("")
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const handleSendMessage = () => {
    onSendMessage(selectedRecipient, message)
    setSelectedRecipient("")
    setMessage("")
    setSearchTerm("")
    onClose()
  }

  const filteredLearners = learners.filter((learner) => learner.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <Input
          type="text"
          placeholder="Search recipients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <Select onValueChange={setSelectedRecipient} value={selectedRecipient}>
          <SelectTrigger className="mb-4">
            <SelectValue placeholder="Select a recipient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Platform Admin</SelectItem>
            {filteredLearners.map((learner) => (
              <SelectItem key={learner.id} value={learner.id}>
                {learner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mb-4"
        />
        <Button onClick={handleSendMessage}>Send Message</Button>
      </DialogContent>
    </Dialog>
  )
}

