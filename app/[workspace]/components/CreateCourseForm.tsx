"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function CreateCourseForm() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const response = await fetch("/api/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        instructor_id: "user-id-here", // You'll need to get this from your auth context
      }),
    })

    if (response.ok) {
      const { course } = await response.json()
      router.push(`/courses/${course.id}`)
    } else {
      // Handle error
      console.error("Failed to create course")
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course Title" required />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Course Description"
        required
      />
      <button type="submit">Create Course</button>
    </form>
  )
}

