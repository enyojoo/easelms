"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Paperclip, SendHorizontal, Copy, RotateCcw, Search, Plus, Edit } from "lucide-react"
import { getClientAuthState } from "@/app/utils/client-auth"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { toast } from "sonner"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUploadZone } from "./components/FileUploadZone"
import { FilePreview } from "./components/FileUploadPreview"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  files?: { name: string; size: number; type: string }[]
}

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  messages: Message[]
}

export default function AIContentPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([
    {
      id: "1",
      title: "Course Outline Generation",
      lastMessage: "Here's a detailed course outline for digital marketing...",
      timestamp: new Date("2024-01-06T10:30:00"),
      messages: [],
    },
    {
      id: "2",
      title: "Quiz Questions",
      lastMessage: "I've generated 5 quiz questions about social media...",
      timestamp: new Date("2024-01-05T15:45:00"),
      messages: [],
    },
    {
      id: "3",
      title: "Lesson Plan Creation",
      lastMessage: "Here's a comprehensive lesson plan for content marketing...",
      timestamp: new Date("2024-01-04T09:20:00"),
      messages: [],
    },
  ])
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<string>("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  const predefinedPrompts = [
    {
      value: "course-outline",
      label: "Create a course outline",
      prompt: "Create a detailed course outline for a course on ",
    },
    {
      value: "lesson-plan",
      label: "Generate a lesson plan",
      prompt: "Write a comprehensive lesson plan for a topic on ",
    },
    {
      value: "quiz-questions",
      label: "Generate quiz questions",
      prompt: "Create 5 multiple-choice quiz questions about ",
    },
    {
      value: "learning-objectives",
      label: "Define learning objectives",
      prompt: "List 5 specific learning objectives for a course on ",
    },
  ]

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "instructor") {
      router.push("/login")
    } else {
      setUser(user)
    }
  }, [router])

  useEffect(() => {
    const scrollArea = document.querySelector("[data-radix-scroll-area-viewport]")
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    if ((!input.trim() && attachedFiles.length === 0) || isGenerating) return

    const userMessage = input.trim()
    setInput("")

    // Create form data with files and message
    const formData = new FormData()
    formData.append("message", userMessage)
    attachedFiles.forEach((file) => {
      formData.append("files", file)
    })

    const newMessage = {
      role: "user" as const,
      content: userMessage,
      timestamp: new Date(),
      files: attachedFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    }
    setMessages((prev) => [...prev, newMessage])
    setIsGenerating(true)
    setAttachedFiles([]) // Clear attached files after sending

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: userMessage,
      })

      const assistantMessage = { role: "assistant" as const, content: text, timestamp: new Date() }
      setMessages((prev) => [...prev, assistantMessage])

      if (!selectedChat) {
        const newChat: ChatHistory = {
          id: Date.now().toString(),
          title: userMessage.slice(0, 30) + "...",
          lastMessage: text.slice(0, 40) + "...",
          timestamp: new Date(),
          messages: [newMessage, assistantMessage],
        }
        setChatHistory((prev) => [newChat, ...prev])
        setSelectedChat(newChat.id)
      } else {
        setChatHistory((prev) =>
          prev.map((chat) =>
            chat.id === selectedChat
              ? {
                  ...chat,
                  lastMessage: text.slice(0, 40) + "...",
                  timestamp: new Date(),
                  messages: [...chat.messages, newMessage, assistantMessage],
                }
              : chat,
          ),
        )
      }
    } catch (error) {
      console.error("Error generating response:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUseInCourse = (content: string) => {
    // For now, we'll just navigate to the course creation page with the content as a query parameter
    // In a real implementation, you'd want to store this in a more appropriate way, perhaps in local storage or a global state
    router.push(`/manage-courses/new?content=${encodeURIComponent(content)}`)
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success("Copied to clipboard")
    } catch (err) {
      toast.error("Failed to copy text")
    }
  }

  const handleRetry = async (index: number) => {
    if (isGenerating) return

    const userMessage = messages[index].content
    // Remove all messages after this one
    setMessages(messages.slice(0, index + 1))
    setIsGenerating(true)

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: userMessage,
      })

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: text,
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error("Error generating response:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleNewChat = () => {
    setSelectedChat(null)
    setMessages([])
    setInput("")
  }

  const handleSelectChat = (chatId: string) => {
    setSelectedChat(chatId)
    const chat = chatHistory.find((c) => c.id === chatId)
    if (chat) {
      setMessages(chat.messages)
    }
  }

  const handleFileSelect = (files: File[]) => {
    setAttachedFiles((prev) => [...prev, ...files])
  }

  const handleFileRemove = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const filteredHistory = chatHistory.filter((chat) => chat.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const renderEmptyState = () => (
    <div className="flex-grow flex items-center justify-center text-center px-4 py-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/50 text-transparent bg-clip-text">
          Plan your courses
        </h1>
        <p className="text-muted-foreground mb-8">
          Ask me to help you create course content, generate lesson plans, write quiz questions, or anything else
          related to your courses.
        </p>
        <div className="grid grid-cols-1 gap-4 text-left">
          <Card
            className="p-4 cursor-pointer hover:bg-accent"
            onClick={() => {
              setInput("Create a course outline for a digital marketing course")
              handleSubmit(new Event("submit") as React.FormEvent<HTMLFormElement>)
            }}
          >
            "Create a course outline for a digital marketing course"
          </Card>
          <Card
            className="p-4 cursor-pointer hover:bg-accent"
            onClick={() => {
              setInput("Generate 5 quiz questions about social media marketing")
              handleSubmit(new Event("submit") as React.FormEvent<HTMLFormElement>)
            }}
          >
            "Generate 5 quiz questions about social media marketing"
          </Card>
          <Card
            className="p-4 cursor-pointer hover:bg-accent"
            onClick={() => {
              setInput("Write a lesson plan about content marketing")
              handleSubmit(new Event("submit") as React.FormEvent<HTMLFormElement>)
            }}
          >
            "Write a lesson plan about content marketing"
          </Card>
          <Card
            className="p-4 cursor-pointer hover:bg-accent"
            onClick={() => {
              setInput("Create learning objectives for an SEO workshop")
              handleSubmit(new Event("submit") as React.FormEvent<HTMLFormElement>)
            }}
          >
            "Create learning objectives for an SEO workshop"
          </Card>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col bg-background">
        <div className="p-4 border-b">
          <Button className="w-full justify-start" onClick={handleNewChat}>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations"
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {filteredHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedChat === chat.id ? "bg-accent" : "hover:bg-muted"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium truncate">{chat.title}</span>
                  <span className="text-xs text-muted-foreground">{format(chat.timestamp, "MMM d")}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedChat && messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <ScrollArea className="flex-grow px-4">
              <div className="max-w-3xl mx-auto py-8 space-y-8">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
                    <div className="flex items-start gap-3 max-w-[80%]">
                      {message.role === "assistant" ? (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-background border">
                          <Image
                            src="http://class.easelms.com/wp-content/uploads/2025/01/EaseLMS-Black.png"
                            alt="AI Assistant"
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : user?.profileImage ? (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                          <Image
                            src={user.profileImage}
                            alt={user.name}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-2">
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {"files" in message && message.files && (
                            <div className="mb-2 space-y-2">
                              {message.files.map((file, fileIndex) => (
                                <div key={fileIndex} className="flex items-center gap-2 p-2 rounded bg-background/10">
                                  <Paperclip className="h-4 w-4" />
                                  <span className="text-sm truncate">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleCopy(message.content)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          {message.role === "assistant" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => handleRetry(index)}
                              disabled={isGenerating}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Rewrite
                            </Button>
                          )}
                          {message.role === "user" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => {
                                setInput(message.content)
                                inputRef.current?.focus()
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="border-t bg-background p-4">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="space-y-4">
                  {attachedFiles.length > 0 && (
                    <div className="space-y-2">
                      {attachedFiles.map((file, index) => (
                        <FilePreview key={index} file={file} onRemove={() => handleFileRemove(index)} />
                      ))}
                    </div>
                  )}
                  <div className="flex items-start gap-2 bg-background rounded-lg border p-2 w-full">
                    <FileUploadZone onFileSelect={handleFileSelect} disabled={isGenerating} />
                    <Select
                      value={selectedPrompt}
                      onValueChange={(value) => {
                        setSelectedPrompt(value)
                        const selected = predefinedPrompts.find((p) => p.value === value)
                        if (selected) {
                          setInput(selected.prompt)
                          handleSubmit()
                        }
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedPrompts.map((prompt) => (
                          <SelectItem key={prompt.value} value={prompt.value}>
                            {prompt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything..."
                      className="flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] resize-none"
                      rows={1}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = "auto"
                        target.style.height = `${target.scrollHeight}px`
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isPro}
                          onCheckedChange={setIsPro}
                          className="data-[state=checked]:bg-primary"
                        />
                        <span className="text-sm font-medium">Pro</span>
                      </div>
                      <Button
                        type="submit"
                        size="icon"
                        disabled={(!input.trim() && attachedFiles.length === 0) || isGenerating}
                      >
                        <SendHorizontal className="h-5 w-5" />
                        <span className="sr-only">Send</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
