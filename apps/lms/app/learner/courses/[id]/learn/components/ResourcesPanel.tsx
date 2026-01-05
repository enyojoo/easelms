"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Link as LinkIcon, 
  Download, 
  ExternalLink,
  File,
  FileImage,
  FileVideo,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Loader2,
  Info
} from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"

interface Resource {
  id?: string
  type: "document" | "link"
  title: string
  url: string
  description?: string
  fileSize?: number
}

interface ResourcesPanelProps {
  resources: Resource[]
}

// Helper function to get file type icon
const getFileIcon = (url: string, type: string) => {
  if (type === "link") {
    return LinkIcon
  }

  const extension = url.split('.').pop()?.toLowerCase() || ''
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    return FileImage
  } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
    return FileVideo
  } else if (['pdf'].includes(extension)) {
    return FileText
  } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
    return FileSpreadsheet
  } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return FileArchive
  } else if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml'].includes(extension)) {
    return FileCode
  }
  
  return File
}

// Helper function to format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return ""
  
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
}

// Helper function to get file type badge
const getFileTypeBadge = (url: string, type: string): string => {
  if (type === "link") return "Link"
  
  const extension = url.split('.').pop()?.toUpperCase() || 'FILE'
  return extension
}

export default function ResourcesPanel({ resources }: ResourcesPanelProps) {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null)

  const handleDownload = async (resource: Resource, index: number) => {
    if (resource.type === "link") {
      // For links, just open in new tab
      window.open(resource.url, "_blank", "noopener,noreferrer")
      return
    }

    // For documents, force download
    setDownloadingIndex(index)
    try {
      // Check if URL is an S3 URL (needs to go through our API)
      const isS3Url = resource.url.includes("s3.amazonaws.com") || 
                     resource.url.includes("amazonaws.com") || 
                     resource.url.includes("cloudfront.net")
      
      let downloadUrl = resource.url
      if (isS3Url) {
        // Use our download API endpoint for S3 files
        downloadUrl = `/api/resources/download?url=${encodeURIComponent(resource.url)}`
      }
      
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch file" }))
        throw new Error(errorData.error || "Failed to fetch file")
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      // Get file extension from URL or content type
      const contentType = response.headers.get("content-type") || ""
      let extension = ""
      if (contentType.includes("pdf")) {
        extension = ".pdf"
      } else if (contentType.includes("word")) {
        extension = ".docx"
      } else if (contentType.includes("excel") || contentType.includes("spreadsheet")) {
        extension = ".xlsx"
      } else if (contentType.includes("zip")) {
        extension = ".zip"
      } else {
        // Try to get extension from URL
        try {
          const urlPath = new URL(resource.url).pathname
          const match = urlPath.match(/\.([a-z0-9]+)$/i)
          if (match) {
            extension = "." + match[1]
          }
        } catch (e) {
          // URL parsing failed, skip extension
        }
      }

      const filename = resource.title + (extension && !resource.title.toLowerCase().endsWith(extension.toLowerCase()) ? extension : "")
      
      // Create temporary anchor element and trigger download
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Clean up blob URL
      window.URL.revokeObjectURL(blobUrl)
    } catch (error: any) {
      console.error("Error downloading file:", error)
      alert(error.message || "Failed to download file. Please try again.")
    } finally {
      setDownloadingIndex(null)
    }
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-center text-muted-foreground text-lg">No resources available for this lesson.</p>
        <p className="text-center text-muted-foreground text-sm mt-2">Check back later for additional materials.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold mb-1">Lesson Resources</h3>
          <p className="text-sm text-muted-foreground">
            {resources.length} {resources.length === 1 ? "resource" : "resources"} available
          </p>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {resources.map((resource, index) => {
          const Icon = getFileIcon(resource.url, resource.type)
          const fileType = getFileTypeBadge(resource.url, resource.type)
          const fileSize = formatFileSize(resource.fileSize)
          const isDownloading = downloadingIndex === index

          return (
            <motion.div
              key={resource.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-200 border-2 hover:border-primary/50">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                      resource.type === "link" 
                        ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                        : "bg-primary/10 text-primary"
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-base leading-tight line-clamp-2">
                            {resource.title}
                          </h4>
                        </div>
                        
                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {fileType}
                          </Badge>
                          {fileSize && (
                            <Badge variant="outline" className="text-xs">
                              {fileSize}
                            </Badge>
                          )}
                          {resource.type === "link" && (
                            <Badge variant="outline" className="text-xs">
                              External Link
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {resource.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {resource.description}
                        </p>
                      )}

                      {/* Action Button */}
                      <div className="pt-2">
                        <Button
                          onClick={() => handleDownload(resource, index)}
                          disabled={isDownloading}
                          variant={resource.type === "link" ? "default" : "outline"}
                          className="w-full sm:w-auto"
                          size="sm"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Downloading...
                            </>
                          ) : resource.type === "link" ? (
                            <>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Link
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50 border-muted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Resources are provided to supplement your learning. 
                {resources.some(r => r.type === "document") && " Download documents to access them offline."}
                {resources.some(r => r.type === "link") && " External links will open in a new tab."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
