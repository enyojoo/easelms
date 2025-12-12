"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Course {
  id: string
  name: string
}

interface NewCourseUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  courses: Course[]
  onSendUpdate: (courseId: string, message: string) => void
}

export default function NewCourseUpdateModal({ isOpen, onClose, courses, onSendUpdate }: NewCourseUpdateModalProps) {
  const [selectedCourse, setSelectedCourse] = useState("")
  const [message, setMessage] = useState("")

  const handleSendUpdate = () => {
    onSendUpdate(selectedCourse, message)
    setSelectedCourse("")
    setMessage("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Course Update</DialogTitle>
        </DialogHeader>
        <Select onValueChange={setSelectedCourse} value={selectedCourse}>
          <SelectTrigger className="mb-4">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Type your course update..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mb-4"
        />
        <Button onClick={handleSendUpdate}>Send Update</Button>
      </DialogContent>
    </Dialog>
  )
}
