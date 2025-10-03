"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { getClientAuthState } from "@/app/utils/client-auth"
import type { User } from "@/app/data/users"
import MessageThreadModal from "../components/MessageThreadModal"
import NewMessageModal from "../components/NewMessageModal"
import { users as allUsersData } from "../data/users" // Import users data and rename it

// Mock data for learner's inbox messages
const mockInboxMessages = [
  {
    id: "1",
    sender: "Jane Smith", // Instructor's name
    unread: true,
    timestamp: "2024-01-05 11:15",
    thread: [
      {
        id: "1a",
        sender: "John Doe",
        content: "Hello, I have a question about the Digital Marketing & Social Media course.",
        timestamp: "2024-01-05 10:30",
      },
      {
        id: "1b",
        sender: "Jane Smith",
        content: "Hi John, I am happy to help. What is your question?",
        timestamp: "2024-01-05 11:00",
      },
    ],
  },
  {
    id: "2",
    sender: "Admin",
    unread: false,
    timestamp: "2024-01-06 14:15",
    thread: [
      {
        id: "2a",
        sender: "Admin",
        content: "Welcome to EaseLMS! We are glad to have you.",
        timestamp: "2024-01-06 14:15",
      },
    ],
  },
]

// Mock data for learner's updates
const mockUpdates = [
  {
    id: "1",
    type: "course",
    name: "Digital Marketing & Social Media",
    message: "New module on Social Media Analytics is now available!",
    timestamp: "2024-01-04 09:00",
  },
  {
    id: "2",
    type: "platform",
    name: "All Users",
    message: "Platform maintenance scheduled for this weekend.",
    timestamp: "2024-01-05 11:00",
  },
]

export default function LearnerMessagesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState("inbox")
  const [selectedMessage, setSelectedMessage] = useState<(typeof mockInboxMessages)[0] | null>(null)
  const [isMessageThreadModalOpen, setIsMessageThreadModalOpen] = useState(false)
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false)
  const [inboxMessages, setInboxMessages] = useState(mockInboxMessages)

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "learner") {
      router.push("/login")
    } else {
      setUser(user)
    }
  }, [router])

  const handleOpenMessageThread = (message: (typeof mockInboxMessages)[0]) => {
    setSelectedMessage(message)
    setIsMessageThreadModalOpen(true)
    // Mark the message as read
    setInboxMessages((prevMessages) =>
      prevMessages.map((msg) => (msg.id === message.id ? { ...msg, unread: false } : msg)),
    )
  }

  const handleSendReply = (reply: string) => {
    console.log("Sending reply:", reply)
    setIsMessageThreadModalOpen(false)
    if (selectedMessage && user) {
      const updatedMessages = inboxMessages.map((msg) =>
        msg.id === selectedMessage.id
          ? {
              ...msg,
              thread: [
                ...msg.thread,
                {
                  id: `${msg.id}-${msg.thread.length + 1}`,
                  sender: user.name,
                  content: reply,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : msg,
      )
      setInboxMessages(updatedMessages)
    }
  }

  const handleSendMessage = (recipientId: string, message: string) => {
    // In a real application, you would send this message to an API
    console.log("Sending message:", { recipientId, message })
    setIsNewMessageModalOpen(false)
  }

  if (!user) {
    return <div>Loading...</div>
  }

  // Ensure recipients is always an array, even if allUsersData is undefined
  const recipients =
    allUsersData && Array.isArray(allUsersData)
      ? allUsersData.filter((u) => u.userType === "instructor" || u.userType === "admin")
      : []

  return (
    <div className=" pt-4 md:pt-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Messages</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inbox</CardTitle>
              <Button onClick={() => setIsNewMessageModalOpen(true)}>New Message</Button>
            </CardHeader>
            <CardContent>
              {inboxMessages.map((message) => (
                <div
                  key={message.id}
                  className="mb-4 p-4 border rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => handleOpenMessageThread(message)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{message.sender}</span>
                    <div className="flex items-center">
                      {message.unread && (
                        <Badge variant="destructive" className="mr-2">
                          New
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">{message.timestamp}</span>
                    </div>
                  </div>
                  <p className="text-sm">{message.thread[message.thread.length - 1].content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="updates">
          <Card>
            <CardHeader>
              <CardTitle>Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {mockUpdates.map((update) => (
                <div key={update.id} className="mb-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">
                      {update.name} ({update.type})
                    </span>
                    <span className="text-sm text-muted-foreground">{update.timestamp}</span>
                  </div>
                  <p className="text-sm">{update.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedMessage && user && (
        <MessageThreadModal
          isOpen={isMessageThreadModalOpen}
          onClose={() => setIsMessageThreadModalOpen(false)}
          messages={selectedMessage.thread}
          onSendReply={handleSendReply}
          instructorName={selectedMessage.sender}
        />
      )}

      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        learners={recipients} // Use recipients here
        onSendMessage={handleSendMessage}
      />
    </div>
  )
}
