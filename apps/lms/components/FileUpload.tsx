"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, File, Image as ImageIcon, Video, FileText, CheckCircle2 } from "lucide-react"
import { useDropzone } from "react-dropzone"

interface FileUploadProps {
  accept?: string
  maxSize?: number
  multiple?: boolean
  onUploadComplete?: (files: File[], urls: string[]) => void
  onRemove?: () => void // Called when file is removed
  type?: "image" | "video" | "document" | "all" | "thumbnail" | "avatar" | "certificate"
  className?: string
  bucket?: "course-thumbnails" | "course-documents" | "user-avatars" | "certificates"
  additionalPath?: string
  initialValue?: string | string[] // URL(s) to restore uploaded state
}

export default function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onUploadComplete,
  onRemove,
  type = "all",
  className,
  bucket,
  additionalPath,
  initialValue,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [removedInitialValue, setRemovedInitialValue] = useState(false)

  // Restore uploaded state from initialValue (only if not explicitly removed)
  useEffect(() => {
    if (initialValue && !removedInitialValue) {
      const urls = Array.isArray(initialValue) ? initialValue : [initialValue]
      setUploadedUrls(urls)
      setUploaded(true)
    } else if (!initialValue) {
      // Reset removed flag when initialValue is cleared by parent
      setRemovedInitialValue(false)
    }
  }, [initialValue, removedInitialValue])

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
    async (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => file.size <= maxSize)
      if (validFiles.length !== acceptedFiles.length) {
        alert(`Some files exceed the maximum size of ${maxSize / 1024 / 1024}MB`)
      }
      setFiles((prev) => (multiple ? [...prev, ...validFiles] : validFiles))
      setUploaded(false)
      
      // Auto-upload files immediately after selection
      if (validFiles.length > 0) {
        setUploading(true)
        setProgress(0)
        setError(null)
        setUploadedUrls([])

        try {
          const urls: string[] = []
          const totalFiles = validFiles.length

          for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i]
            const formData = new FormData()
            formData.append("file", file)

            // Determine file type for bucket selection
            let fileType = type
            if (type === "all") {
              if (file.type.startsWith("image/")) {
                fileType = "document" // Default to document for general uploads
              } else {
                fileType = "document"
              }
            }

            formData.append("type", fileType)
            if (bucket) {
              formData.append("bucket", bucket)
            }
            if (additionalPath) {
              formData.append("additionalPath", additionalPath)
            }

            const response = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || `Failed to upload ${file.name}`)
            }

            const data = await response.json()
            urls.push(data.url)

            // Update progress
            setProgress(Math.round(((i + 1) / totalFiles) * 100))
          }

          setUploadedUrls(urls)
          setUploading(false)
          setUploaded(true)
          onUploadComplete?.(validFiles, urls)
        } catch (err: any) {
          setError(err.message || "Upload failed")
          setUploading(false)
          setUploaded(false)
        }
      }
    },
    [maxSize, multiple, type, bucket, additionalPath, onUploadComplete]
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
    setError(null)
    setUploadedUrls([])

    try {
      const urls: string[] = []
      const totalFiles = files.length

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append("file", file)

        // Determine file type for bucket selection
        let fileType = type
        if (type === "all") {
          if (file.type.startsWith("image/")) {
            fileType = "document" // Default to document for general uploads
          } else {
            fileType = "document"
          }
        }

        formData.append("type", fileType)
        if (bucket) {
          formData.append("bucket", bucket)
        }
        if (additionalPath) {
          formData.append("additionalPath", additionalPath)
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to upload ${file.name}`)
        }

        const data = await response.json()
        urls.push(data.url)

        // Update progress
        setProgress(Math.round(((i + 1) / totalFiles) * 100))
      }

      setUploadedUrls(urls)
      setUploading(false)
      setUploaded(true)
      onUploadComplete?.(files, urls)
    } catch (err: any) {
      setError(err.message || "Upload failed")
      setUploading(false)
      setUploaded(false)
    }
  }

  const removeFile = (index?: number) => {
    if (index !== undefined) {
      setFiles((prev) => prev.filter((_, i) => i !== index))
    } else {
      // Remove all files (including initialValue)
      setFiles([])
      setRemovedInitialValue(true)
    }
    setUploadedUrls([])
    setUploaded(false)
    setUploading(false)
    setProgress(0)
    setError(null)
    onRemove?.() // Notify parent that file was removed
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

  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const fileName = pathname.split("/").pop() || "File"
      return decodeURIComponent(fileName)
    } catch {
      return url.split("/").pop() || "File"
    }
  }

  const hasFiles = files.length > 0 || uploadedUrls.length > 0
  const showDropzone = !hasFiles && !uploading

  return (
    <div className={className}>
      {/* Show drag & drop area only when no files */}
      {showDropzone && (
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
      )}

      {/* Show file cards when files are selected or uploaded */}
      {hasFiles && (
        <div className="space-y-2">
          {/* Show files from File objects */}
          {files.map((file, index) => {
            // Calculate perimeter for continuous progress bar around frame
            // Using a ref to get actual dimensions would be better, but for now we'll use a large enough value
            const perimeter = 2000 // Approximate perimeter value
            const strokeWidth = 2
            const offset = perimeter * (1 - progress / 100)

            return (
              <Card
                key={index}
                className="relative overflow-hidden"
              >
                {/* Progress bar around the entire frame - continuous border */}
                {uploading && (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: '100%', height: '100%' }}
                  >
                    <rect
                      x={strokeWidth / 2}
                      y={strokeWidth / 2}
                      width="calc(100% - 2px)"
                      height="calc(100% - 2px)"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth={strokeWidth}
                      rx="8"
                      strokeDasharray={perimeter}
                      strokeDashoffset={offset}
                      className="transition-all duration-300"
                      style={{ 
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round'
                      }}
                    />
                  </svg>
                )}
                <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploaded && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })}

          {/* Show restored uploaded state when initialValue is provided but no files */}
          {uploadedUrls.length > 0 && files.length === 0 && (
            <Card className="relative overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="h-5 w-5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getFileName(uploadedUrls[0])}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {uploadedUrls[0]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploaded && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile()}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

