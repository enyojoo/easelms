"use client"

import { useState, useEffect, useRef } from "react"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Video, VideoOff } from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface VideoConferenceProps {
  sessionId: string
}

export default function VideoConference({ sessionId }: VideoConferenceProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [participants, setParticipants] = useState<string[]>([])
  const webcamRef = useRef<Webcam>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = io("http://localhost:3001")

    socketRef.current.on("connect", () => {
      console.log("Connected to WebSocket server")
      socketRef.current?.emit("joinVideoConference", sessionId)
    })

    socketRef.current.on("participantJoined", (participantId: string) => {
      setParticipants((prev) => [...prev, participantId])
    })

    socketRef.current.on("participantLeft", (participantId: string) => {
      setParticipants((prev) => prev.filter((id) => id !== participantId))
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [sessionId])

  const toggleMute = () => {
    setIsMuted(!isMuted)
    // In a real implementation, you would mute/unmute the audio track here
  }

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn)
    // In a real implementation, you would enable/disable the video track here
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow grid grid-cols-2 gap-6">
        <Card className="relative">
          <Webcam audio={false} ref={webcamRef} mirrored className="w-full h-full object-cover rounded-lg" />
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">You</div>
        </Card>
        {participants.map((participantId) => (
          <Card key={participantId} className="relative">
            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">Participant Video</span>
            </div>
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
              {participantId}
            </div>
          </Card>
        ))}
      </div>
      <div className="flex justify-center space-x-4 mt-4">
        <Button onClick={toggleMute} variant="outline" size="icon">
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button onClick={toggleVideo} variant="outline" size="icon">
          {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

