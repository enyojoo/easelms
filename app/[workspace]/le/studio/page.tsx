"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getClientAuthState } from "@/app/utils/client-auth"
import { v4 as uuidv4 } from "uuid"
import { Users, Clock, Calendar } from "lucide-react"

// Mock data for public live studio sessions
const publicSessions = [
  {
    id: "1",
    title: "JavaScript Masterclass",
    host: "Sarah Johnson",
    participants: 15,
    startTime: "2024-01-15T14:00:00Z",
    duration: 90, // in minutes
    description: "Join us for an interactive session on advanced JavaScript concepts.",
  },
  {
    id: "2",
    title: "UI/UX Design Workshop",
    host: "Michael Chen",
    participants: 20,
    startTime: "2024-01-16T18:30:00Z",
    duration: 120,
    description: "Learn the latest trends and techniques in UI/UX design in this hands-on workshop.",
  },
  {
    id: "3",
    title: "AI for Beginners",
    host: "Emily Rodriguez",
    participants: 25,
    startTime: "2024-01-17T15:00:00Z",
    duration: 60,
    description: "Get started with AI fundamentals in this beginner-friendly session.",
  },
]

export default function StudioPage() {
  const router = useRouter()
  const { isLoggedIn, userType } = getClientAuthState()
  const [sessionCode, setSessionCode] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login")
    }

    if (userType !== "learner") {
      router.push("/dash") // Redirect instructors to their dashboard
    }
  }, [isLoggedIn, router, userType])

  const handleCreateSession = () => {
    const sessionId = uuidv4()
    router.push(`/studio/session/${sessionId}`)
  }

  const handleJoinSession = () => {
    if (!sessionCode.trim()) {
      setError("Please enter a session code")
      return
    }

    // In a real application, you would validate the session code here
    // For now, we'll just navigate to the session page
    router.push(`/studio/session/${sessionCode}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className="pt-4 md:pt-8">
      <Card className=" mb-5">
        <CardHeader>
          <h1 className="text-3xl font-bold text-primary mb-2">Collaborative Sessions</h1>

          <CardDescription>
            This space is designed for you to connect with your peers, work together on projects, and share ideas in
            real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button onClick={handleCreateSession} className="w-full sm:w-auto">
              Create Session
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <Label htmlFor="sessionCode" className="sr-only">
                  Session Code
                </Label>
                <Input
                  id="sessionCode"
                  placeholder="Enter session code"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value)
                    setError("")
                  }}
                />
              </div>
              <Button onClick={handleJoinSession} variant="outline" className="w-full sm:w-auto">
                Join Private Session
              </Button>
            </div>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>

      <h3 className="text-xl font-bold mb-4">Public Live Sessions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {publicSessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <CardTitle>{session.title}</CardTitle>
              <CardDescription>Hosted by {session.host}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{session.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                <span>{session.participants} participants</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(session.startTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{session.duration} minutes</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => router.push(`/studio/session/${session.id}`)}>
                Join Session
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

