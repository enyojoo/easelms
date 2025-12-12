import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock, BarChart, Award } from "lucide-react"
import Image from "next/image"

interface Course {
  id: number
  title: string
  description: string
  image: string
  lessons: { title: string }[]
}

interface CoursePreviewModalProps {
  course: Course
  isOpen: boolean
  onClose: () => void
}

export default function CoursePreviewModal({ course, isOpen, onClose }: CoursePreviewModalProps) {
  const courseImages: Record<string, string> = {
    "Digital Marketing & Social Media":
      "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1474&q=80",
    "Startup Fundamentals":
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    "Basic Money Management":
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1511&q=80",
    "Public Speaking & Communication":
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    "Building Side Hustles":
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    "Tech Skills (No-code, AI Basics)":
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{course.title}</DialogTitle>
          <DialogDescription>Course Preview</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Image
            src={(courseImages as Record<string, string>)[course.title] || course.image}
            alt={course.title}
            width={400}
            height={225}
            className="w-full h-48 object-cover rounded-lg"
          />
          <p className="text-sm text-gray-600">{course.description}</p>
          <div className="flex justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>4 hours</span>
            </div>
            <div className="flex items-center">
              <BarChart className="w-4 h-4 mr-1" />
              <span>{course.lessons.length} lessons</span>
            </div>
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-1" />
              <span>Certificate</span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Lessons:</h3>
            <ul className="list-disc pl-5 text-sm">
              {course.lessons.map((lesson, index) => (
                <li key={index}>{lesson.title}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
