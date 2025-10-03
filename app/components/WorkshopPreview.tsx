"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, MapPin, Globe } from "lucide-react"

interface Workshop {
  id: number
  title: string
  date: string
  time: string
  attendees: number
  isOnline: boolean
  address?: string
  description: string
}

interface WorkshopPreviewProps {
  workshop: Workshop
  onClose: () => void
}

export default function WorkshopPreview({ workshop, onClose }: WorkshopPreviewProps) {
  const [isRegistered, setIsRegistered] = useState(false)

  const handleRegister = () => {
    // In a real app, this would call an API to register the user
    setIsRegistered(true)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{workshop.title}</CardTitle>
        <CardDescription>Workshop Preview (Learner View)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span>{workshop.date}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-primary" />
          <span>{workshop.time}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <span>{workshop.attendees} attendees</span>
        </div>
        <div className="flex items-center space-x-2">
          {workshop.isOnline ? (
            <>
              <Globe className="h-5 w-5 text-primary" />
              <span>Online Workshop</span>
            </>
          ) : (
            <>
              <MapPin className="h-5 w-5 text-primary" />
              <span>{workshop.address}</span>
            </>
          )}
        </div>
        <p className="text-gray-600">{workshop.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Close Preview
        </Button>
        <Button onClick={handleRegister} disabled={isRegistered}>
          {isRegistered ? "Registered" : "Register for Workshop"}
        </Button>
      </CardFooter>
    </Card>
  )
}
