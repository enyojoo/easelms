"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, File, Image as ImageIcon, Video, FileText, CheckCircle2 } from "lucide-react"
import { useDropzone } from "react-dropzone"

interface FileUploadProps {
  accept?: string
  maxSize?: number
  multiple?: boolean
  onUploadComplete?: (files: File[]) => void
  type?: "image" | "video" | "document" | "all"
  className?: string
}

export default function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onUploadComplete,
  type = "all",
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState(false)

  const getAcceptTypes = (): Record<string, string[]> | undefined => {
    switch (type) {
      case "image":
        return { "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] }
      case "video":
        return { "video/*": [".mp4", ".webm", ".ogg"] }
      case "document":
        return { "application/*": [".pdf", ".doc", ".docx", ".txt"] }
      default:
        return accept ? { [accept]: [] } : undefined
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => file.size <= maxSize)
      if (validFiles.length !== acceptedFiles.length) {
        alert(`Some files exceed the maximum size of ${maxSize / 1024 / 1024}MB`)
      }
      setFiles((prev) => (multiple ? [...prev, ...validFiles] : validFiles))
      setUploaded(false)
    },
    [maxSize, multiple]
  )

  const acceptTypes = getAcceptTypes()
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : acceptTypes,
    multiple,
    maxSize,
  })

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    // Mock upload - in real app, this would upload to S3
    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      setUploading(false)
      setUploaded(true)
      onUploadComplete?.(files)
    }, 2000)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setUploaded(false)
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="h-5 w-5" />
    if (file.type.startsWith("video/")) return <Video className="h-5 w-5" />
    return <FileText className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-primary font-medium">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-sm font-medium mb-1">
              Drag & drop files here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              {type === "image" && "Images only"}
              {type === "video" && "Videos only"}
              {type === "document" && "Documents only"}
              {type === "all" && "All file types"}
              {` • Max size: ${maxSize / 1024 / 1024}MB`}
            </p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <Card key={index}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  {!uploading && !uploaded && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {uploaded && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {!uploading && !uploaded && (
            <Button onClick={handleUpload} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Upload {files.length} file{files.length > 1 ? "s" : ""}
            </Button>
          )}

          {uploaded && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Upload complete!</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

