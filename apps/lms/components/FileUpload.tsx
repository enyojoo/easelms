"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, File, Image as ImageIcon, Video, FileText, CheckCircle2, Loader2 } from "lucide-react"
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
  const [uploadMetadata, setUploadMetadata] = useState<Array<{ url: string; bucket: string; path: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [removedInitialValue, setRemovedInitialValue] = useState(false)

  // Restore uploaded state from initialValue (only if not explicitly removed)
  // This runs on mount and when initialValue changes
  useEffect(() => {
    if (initialValue && !removedInitialValue) {
      const urls = Array.isArray(initialValue) ? initialValue : [initialValue]
      // Always restore if URLs don't match (handles remounts and prop changes)
      if (JSON.stringify(uploadedUrls) !== JSON.stringify(urls)) {
        setUploadedUrls(urls)
        setUploaded(true)
        // Restore metadata for deletion if needed
        if (urls.length > 0) {
          const url = urls[0]
          // Check if it's an S3 URL
          const isS3Url = url.includes("s3.amazonaws.com") || url.includes("cloudfront.net") || url.includes("amazonaws.com")
          
          if (isS3Url) {
            // Extract S3 key from URL
            let s3Key = ""
            try {
              if (url.includes("s3.amazonaws.com")) {
                const urlParts = url.split(".s3.")
                if (urlParts.length > 1) {
                  s3Key = urlParts[1].split("/").slice(1).join("/").split("?")[0] // Remove query params
                }
              } else if (url.includes("cloudfront.net")) {
                const urlObj = new URL(url)
                s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
              } else if (url.includes("amazonaws.com")) {
                const match = url.match(/amazonaws\.com\/(.+)$/)
                if (match) {
                  s3Key = match[1].split("?")[0] // Remove query params
                }
              }
            } catch {
              // If extraction fails, that's okay - deletion API will try to extract it
            }
            setUploadMetadata([{ url, bucket: "s3", path: s3Key }])
          } else if (bucket) {
            // Supabase Storage URL
            try {
              const urlParts = url.split(`/${bucket}/`)
              if (urlParts.length > 1) {
                const path = urlParts[1]
                setUploadMetadata([{ url, bucket, path }])
              } else {
                // Try alternative URL format
                const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
                if (match) {
                  setUploadMetadata([{ url, bucket, path: match[1] }])
                } else {
                  setUploadMetadata([{ url, bucket, path: "" }])
                }
              }
            } catch {
              // If we can't extract path, that's okay - deletion might still work with URL
              setUploadMetadata([{ url, bucket, path: "" }])
            }
          } else {
            // No bucket info, try to infer from URL
            setUploadMetadata([{ url, bucket: bucket || "course-documents", path: "" }])
          }
        }
      }
    } else if (!initialValue) {
      // If initialValue is cleared by parent, reset removed flag and clear state
      if (removedInitialValue) {
        setRemovedInitialValue(false)
      }
      // Clear state if initialValue is removed and we have no files
      if (uploadedUrls.length > 0 && files.length === 0) {
        setUploadedUrls([])
        setUploadMetadata([])
        setUploaded(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue, bucket]) // Removed removedInitialValue from deps to allow restoration on remount

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
          const metadata: Array<{ url: string; bucket: string; path: string }> = []
          const totalFiles = validFiles.length
          const currentBucket = bucket || (type === "thumbnail" ? "course-thumbnails" : type === "document" ? "course-documents" : "course-documents")

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
            
            // For S3 files, extract the key from the path
            // The API returns path as the S3 key when bucket is "s3"
            const isS3File = data.bucket === "s3"
            metadata.push({
              url: data.url,
              bucket: isS3File ? "s3" : data.bucket,
              path: data.path, // This is the S3 key for S3 files
            })

            // Update progress
            setProgress(Math.round(((i + 1) / totalFiles) * 100))
          }

          setUploadedUrls(urls)
          setUploadMetadata(metadata)
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

  const removeFile = async (index?: number) => {
    // Delete file from S3 or Supabase Storage if it was uploaded
    if (index !== undefined && uploadMetadata[index]) {
      const meta = uploadMetadata[index]
      try {
        const response = await fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: meta.url,
            bucket: meta.bucket,
            path: meta.path,
          }),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Failed to delete file from storage:", errorData.error || "Unknown error")
        }
      } catch (err) {
        console.error("Failed to delete file from storage:", err)
        // Continue with removal even if delete fails
      }
      setFiles((prev) => prev.filter((_, i) => i !== index))
      setUploadedUrls((prev) => prev.filter((_, i) => i !== index))
      setUploadMetadata((prev) => prev.filter((_, i) => i !== index))
    } else if (index === undefined) {
      // Remove all files (including initialValue)
      // Delete all uploaded files from S3 or Supabase
      if (uploadMetadata.length > 0) {
        await Promise.all(
          uploadMetadata.map((meta) =>
            fetch("/api/upload/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: meta.url,
                bucket: meta.bucket,
                path: meta.path,
              }),
            })
              .then((response) => {
                if (!response.ok) {
                  return response.json().then((errorData) => {
                    console.error("Failed to delete file from storage:", errorData.error || "Unknown error")
                  })
                }
              })
              .catch((err) => {
                console.error("Failed to delete file from storage:", err)
              })
          )
        )
      }
      // Also try to delete initialValue if it exists
      if (uploadedUrls.length > 0 && files.length === 0) {
        // This is an initialValue file
        const url = uploadedUrls[0]
        // Check if it's an S3 URL
        const isS3Url = url.includes("s3.amazonaws.com") || url.includes("cloudfront.net") || url.includes("amazonaws.com")
        
        // Try to get metadata for this URL
        const existingMeta = uploadMetadata.find((m) => m.url === url)
        
        try {
          const response = await fetch("/api/upload/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url,
              bucket: existingMeta?.bucket || (isS3Url ? "s3" : (bucket || (type === "thumbnail" ? "course-thumbnails" : "course-documents"))),
              path: existingMeta?.path,
            }),
          })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error("Failed to delete initialValue file from storage:", errorData.error || "Unknown error")
          }
        } catch (err) {
          console.error("Failed to delete initialValue file from storage:", err)
        }
      }
      setFiles([])
      setRemovedInitialValue(true)
      setUploadedUrls([])
      setUploadMetadata([])
    }
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
    <div className={`w-full max-w-full overflow-hidden ${className || ""}`}>
      {/* Show drag & drop area only when no files */}
      {showDropzone && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors w-full max-w-full ${
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
        <div className="space-y-2 w-full max-w-full">
          {/* Show files from File objects */}
          {files.map((file, index) => (
            <Card
              key={index}
              className="relative overflow-hidden w-full"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {uploading && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                    )}
                    {uploaded && !uploading && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                    {!uploading && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Show restored uploaded state when initialValue is provided but no files */}
          {uploadedUrls.length > 0 && files.length === 0 && (
            <Card className="relative overflow-hidden w-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                    <File className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {getFileName(uploadedUrls[0])}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {uploading && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                    )}
                    {uploaded && !uploading && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                    {!uploading && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile()}
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
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

