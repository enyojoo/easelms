"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Link, Download } from "lucide-react"
import { useState } from "react"

interface ResourcesPanelProps {
  resources: {
    type: "document" | "link"
    title: string
    url: string
  }[]
}

export default function ResourcesPanel({ resources }: ResourcesPanelProps) {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null)

  const handleDownload = async (resource: { type: string; title: string; url: string }, index: number) => {
    if (resource.type === "link") {
      // For links, just open in new tab
      window.open(resource.url, "_blank", "noopener,noreferrer")
      return
    }

    // For documents, force download
    setDownloadingIndex(index)
    try {
      // Check if URL is an S3 URL (needs to go through our API)
      const isS3Url = resource.url.includes("s3.amazonaws.com") || resource.url.includes("amazonaws.com") || resource.url.includes("cloudfront.net")
      
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
          <p className="text-center text-muted-foreground py-8">No resources available for this lesson.</p>
    )
  }

  return (
        <ul className="space-y-4">
          {resources.map((resource, index) => (
            <li key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg">
              <span className="flex items-center text-text-primary mb-2 sm:mb-0">
                {resource.type === "document" ? (
                  <FileText className="mr-2 h-4 w-4 text-blue-400 flex-shrink-0" />
                ) : (
                  <Link className="mr-2 h-4 w-4 text-green-400 flex-shrink-0" />
                )}
                <span className="truncate">{resource.title}</span>
              </span>
          <button
            onClick={() => handleDownload(resource, index)}
            disabled={downloadingIndex === index}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full sm:w-auto mt-2 sm:mt-0"
          >
                  {resource.type === "document" ? (
                    <>
                      <Download className="mr-2 h-4 w-4" /> 
                      {downloadingIndex === index ? "Downloading..." : "Download"}
                    </>
                  ) : (
                    <>Open</>
                  )}
                </button>
            </li>
          ))}
        </ul>
  )
}
