"use client"

import { useState } from "react"
import { X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

interface FilePreviewProps {
  file: File
  onRemove: () => void
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(() => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file)
    }
    return null
  })

  const getFileIcon = () => {
    const extension = file.name.split(".").pop()?.toLowerCase()

    switch (extension) {
      case "pdf":
        return "📄"
      case "doc":
      case "docx":
        return "📝"
      case "txt":
        return "📃"
      default:
        return "📎"
    }
  }

  return (
    <div className="relative group">
      <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
        {preview ? (
          <div className="relative w-12 h-12 rounded overflow-hidden">
            <Image src={preview} alt={file.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center text-2xl bg-muted rounded">{getFileIcon()}</div>
        )}
        <div className="flex-grow min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

