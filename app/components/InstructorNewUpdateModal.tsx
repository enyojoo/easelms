"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Course {
  id: number
  title: string
}

interface Workshop {
  id: number
  title: string
}

interface InstructorNewUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  courses: Course[]
  workshops: Workshop[]
  onSendUpdate: (type: "course" | "workshop", id: string, recipients: string, message: string) => void
}

export default function InstructorNewUpdateModal({
  isOpen,
  onClose,
  courses,
  workshops,
  onSendUpdate,
}: InstructorNewUpdateModalProps) {
  const [updateType, setUpdateType] = useState<"course" | "workshop">("course")
  const [selectedId, setSelectedId] = useState("all")
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const handleSendUpdate = () => {
    onSendUpdate(updateType, selectedId, "learners", message)
    setUpdateType("course")
    setSelectedId("all")
    setMessage("")
    setSearchTerm("")
    onClose()
  }

  const filteredOptions =
    updateType === "course"
      ? courses.filter((course) => course.title.toLowerCase().includes(searchTerm.toLowerCase()))
      : workshops.filter((workshop) => workshop.title.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Update</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="updateType">Update Type</Label>
            <Select value={updateType} onValueChange={(value: "course" | "workshop") => setUpdateType(value)}>
              <SelectTrigger id="updateType">
                <SelectValue placeholder="Select update type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="course">Course Update</SelectItem>
                <SelectItem value="workshop">Workshop Update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="searchTerm">Search {updateType === "course" ? "Courses" : "Workshops"}</Label>
            <Input
              id="searchTerm"
              type="text"
              placeholder={`Search ${updateType}s...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="selectedId">Select {updateType === "course" ? "Course" : "Workshop"}</Label>
            <Select onValueChange={setSelectedId} value={selectedId}>
              <SelectTrigger id="selectedId">
                <SelectValue placeholder={`Select a ${updateType}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {updateType === "course" ? "Courses" : "Workshops"}</SelectItem>
                {filteredOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id.toString()}>
                    {option.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipients">Recipients</Label>
            <Input id="recipients" value="Learners" disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder={`Type your ${updateType} update...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <Button onClick={handleSendUpdate} className="w-full">
            Send Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

