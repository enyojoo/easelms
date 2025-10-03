"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings, 
  Bookmark, 
  MessageSquare,
  Clock,
  CheckCircle2,
  SkipBack,
  SkipForward,
  Captions,
  PlayCircle
} from "lucide-react"
import { Slider } from "@/components/ui/slider"

interface SmartVideoPlayerProps {
  videoUrl: string
  lessonTitle: string
  onComplete: () => void
  autoPlay?: boolean
  isActive?: boolean
}

interface VideoBookmark {
  id: string
  time: number
  title: string
  note?: string
  timestamp: string
}

interface VideoChapter {
  time: number
  title: string
  description?: string
}

export default function SmartVideoPlayer({ 
  videoUrl, 
  lessonTitle, 
  onComplete, 
  autoPlay = false,
  isActive = true 
}: SmartVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([])
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [notes, setNotes] = useState<{ [key: number]: string }>({})
  const [showNotes, setShowNotes] = useState(false)

  // Mock chapters - in real app, these would come from the lesson data
  const chapters: VideoChapter[] = [
    { time: 0, title: "Introduction", description: "Course overview and objectives" },
    { time: 120, title: "Key Concepts", description: "Main topics and theories" },
    { time: 300, title: "Practical Examples", description: "Real-world applications" },
    { time: 450, title: "Summary", description: "Key takeaways and next steps" }
  ]

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      
      // Auto-complete when video reaches 90%
      if (video.currentTime / video.duration >= 0.9 && !isPlaying) {
        onComplete()
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    if (autoPlay && isActive) {
      video.play()
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [autoPlay, isActive, onComplete])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    video.volume = value[0]
    setVolume(value[0])
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = rate
    setPlaybackRate(rate)
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (!isFullscreen) {
      video.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const addBookmark = () => {
    const video = videoRef.current
    if (!video) return

    const newBookmark: VideoBookmark = {
      id: Date.now().toString(),
      time: video.currentTime,
      title: `Bookmark at ${formatTime(video.currentTime)}`,
      timestamp: new Date().toISOString()
    }

    setBookmarks(prev => [...prev, newBookmark])
  }

  const jumpToBookmark = (bookmark: VideoBookmark) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = bookmark.time
    setCurrentTime(bookmark.time)
  }

  const jumpToChapter = (chapter: VideoChapter) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = chapter.time
    setCurrentTime(chapter.time)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        poster="/placeholder.svg?height=400&width=800"
      />

      {/* Video Overlay Controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {lessonTitle}
            </Badge>
            <Badge variant="outline" className="bg-white/20 text-white border-white/30">
              {formatTime(currentTime)} / {formatTime(duration)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowChapters(!showChapters)}
              className="text-white hover:bg-white/20"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowBookmarks(!showBookmarks)}
              className="text-white hover:bg-white/20"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white hover:bg-white/20"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Center Play Button */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="lg"
              onClick={togglePlay}
              className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <Play className="h-8 w-8 ml-1" />
            </Button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          {/* Progress Bar */}
          <div className="relative">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="absolute top-0 left-0 w-full h-2 bg-white/20 rounded-full">
              <div 
                className="h-2 bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const video = videoRef.current
                  if (video) video.currentTime = Math.max(0, video.currentTime - 10)
                }}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const video = videoRef.current
                  if (video) video.currentTime = Math.min(duration, video.currentTime + 10)
                }}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <div className="w-20">
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={addBookmark}
                className="text-white hover:bg-white/20"
              >
                <Bookmark className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Side Panels */}
      {showChapters && (
        <Card className="absolute right-4 top-16 w-80 max-h-96 overflow-y-auto">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Chapters</h3>
            <div className="space-y-2">
              {chapters.map((chapter, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer"
                  onClick={() => jumpToChapter(chapter)}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{chapter.title}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(chapter.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showBookmarks && (
        <Card className="absolute right-4 top-16 w-80 max-h-96 overflow-y-auto">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Bookmarks</h3>
            <div className="space-y-2">
              {bookmarks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookmarks yet</p>
              ) : (
                bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={() => jumpToBookmark(bookmark)}
                  >
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{bookmark.title}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(bookmark.time)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showSettings && (
        <Card className="absolute right-4 top-16 w-80">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Playback Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Playback Speed</label>
                <div className="flex gap-2 mt-2">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <Button
                      key={rate}
                      size="sm"
                      variant={playbackRate === rate ? "default" : "outline"}
                      onClick={() => changePlaybackRate(rate)}
                    >
                      {rate}x
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Quality</label>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline">Auto</Button>
                  <Button size="sm" variant="outline">1080p</Button>
                  <Button size="sm" variant="outline">720p</Button>
                  <Button size="sm" variant="outline">480p</Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Captions className="h-4 w-4 mr-1" />
                  Subtitles
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
