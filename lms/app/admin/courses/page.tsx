"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookOpen, Edit, Trash2, Eye, Clock, Users, Banknote } from "lucide-react"
import { getClientAuthState } from "@/utils/client-auth" // Correct import
import { modules } from "@/data/courses"
import type { User } from "@/data/users"

export default function ManageCoursesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "admin") {
      router.push("/auth/admin/login")
    } else {
      setUser(user)
    }
  }, [router])

  if (!user) {
    return <div>Loading...</div>
  }

  const filteredCourses = modules.filter((course) => course.title.toLowerCase().includes(searchTerm.toLowerCase()))

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

  const renderCourseCard = (course: typeof modules[0]) => (
    <Card key={course.id} className="flex flex-col h-full">
      <CardHeader className="p-6">
        <div className="aspect-video relative rounded-md overflow-hidden mb-4">
          <Image
            src={courseImages[course.title] || "/placeholder.svg?height=200&width=300"}
            alt={course.title}
            layout="fill"
            objectFit="cover"
          />
        </div>
        <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 mr-1" />
            <span>{course.lessons.length} lessons</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>4 hours</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            <span>{course.enrolledStudents || 0} learners</span>
          </div>
          <div className="flex items-center">
            <Banknote className="w-4 h-4 mr-1" />
            <span>{course.price ? `$${course.price}` : "Free"}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow px-6 pb-6">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{course.description}</p>
      </CardContent>
      <CardFooter className="flex gap-2 p-6 pt-0 justify-center">
        <Link href={`/admin/courses/preview/${course.id}`} passHref>
          <Button variant="outline" className="flex items-center w-full justify-center text-sm py-1">
            <Eye className="mr-1 h-4 w-4" /> Preview
          </Button>
        </Link>
        <Link href={`/admin/courses/new?edit=${course.id}`}>
          <Button variant="outline" className="flex items-center w-full justify-center text-sm py-1">
            <Edit className="mr-1 h-4 w-4" /> Edit
          </Button>
        </Link>
        <Button variant="destructive" className="flex items-center w-full justify-center text-sm py-1">
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </CardFooter>
    </Card>
  )

  return (
    <div className=" pt-4 md:pt-8">
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Courses</h1>
        <Link href="/admin/courses/new" passHref>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <BookOpen className="mr-2 h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <Input
          id="search"
          type="text"
          placeholder="Search by course title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map(renderCourseCard)}
      </div>
    </div>
  )
}
