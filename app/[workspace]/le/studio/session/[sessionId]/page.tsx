"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus, PhoneOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getClientAuthState } from "@/app/utils/client-auth"
import Whiteboard from "../../components/Whiteboard"
import Chat from "../../components/Chat"
import VideoConference from "../../components/VideoConference"
import Logo from "@/app/components/Logo"

// Add this mapping at the top of the file, after the imports
const sessionTitles = {
  "1": "JavaScript Masterclass",
  "2": "UI/UX Design Workshop",
  "3": "AI for Beginners",
}

// Mock participant data
const participants = [
  { id: 1, name: "Alice", role: "learner", profileImage: "/placeholder.svg?height=40&width=40" },
  { id: 2, name: "Bob", role: "learner", profileImage: "/placeholder.svg?height=40&width=40" },
  { id: 3, name: "Charlie", role: "learner", profileImage: "/placeholder.svg?height=40&width=40" },
]

export default function SessionPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter()
  const { isLoggedIn, userType } = getClientAuthState()
  const [activeTab, setActiveTab] = useState<"whiteboard" | "chat" | "video">("video")

  // Determine the session title
  const sessionTitle = sessionTitles[params.sessionId] || "New Session"

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login")
    }

    if (userType !== "learner") {
      router.push("/dash")
    }

    // Set body to full height and remove overflow
    document.body.style.height = "100vh"
    document.body.style.overflow = "hidden"

    // Cleanup function to reset body styles when component unmounts
    return () => {
      document.body.style.height = ""
      document.body.style.overflow = ""
    }
  }, [isLoggedIn, router, userType])

  const handleMute = () => {
    // Implement mute logic here
    console.log("Toggling mute...")
  }

  const handleVideo = () => {
    // Implement video toggle logic here
    console.log("Toggling video...")
  }

  const handleInvite = () => {
    // Implement invite logic here
    console.log("Inviting user...")
  }

  const handleLeaveSession = () => {
    // Implement leave session logic here
    console.log("Leaving session...")
    router.push("/studio")
  }

  return (
    <div className="p-4">
      <div className="flex-grow flex lg:flex-row flex-col max-w-full">
        {/* Central Canvas */}
        <div className="flex-grow flex flex-col">
          <div className="flex justify-right mb-4">
            {" "}
            {/* Logo container */}
            <Logo className="w-20 h-auto" />
          </div>
          <div className="bg-white dark:bg-[#18181b] rounded-lg border border-border p-4 flex-grow flex flex-col shadow-lg">
            {activeTab === "whiteboard" && <Whiteboard sessionId={params.sessionId} />}
            {activeTab === "chat" && <Chat sessionId={params.sessionId} />}
            {activeTab === "video" && <VideoConference sessionId={params.sessionId} />}
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-80 p-4 space-y-4 bg-background-element">
          <h2 className="text-2xl font-bold mb-4">{sessionTitle}</h2>
          {/* Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button variant={activeTab === "video" ? "default" : "outline"} onClick={() => setActiveTab("video")}>
                  Video
                </Button>
                <Button
                  variant={activeTab === "whiteboard" ? "default" : "outline"}
                  onClick={() => setActiveTab("whiteboard")}
                >
                  Board
                </Button>
                <Button variant={activeTab === "chat" ? "default" : "outline"} onClick={() => setActiveTab("chat")}>
                  Chat
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Session Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleInvite} variant="outline" className="w-full text-sm">
                <UserPlus className="mr-2 h-4 w-4" /> Invite
              </Button>
              <Button onClick={handleLeaveSession} variant="destructive" className="w-full text-sm">
                <PhoneOff className="mr-2 h-4 w-4" /> End Session
              </Button>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm">
                {participants.map((participant) => (
                  <li key={participant.id} className="flex items-center space-x-3 mb-2">
                    <Avatar>
                      <AvatarImage src={participant.profileImage} />
                      <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>
                      {participant.name} ({participant.role})
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

