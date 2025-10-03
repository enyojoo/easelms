"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileUploadZoneProps {
  onFileSelect: (files: File[]) => void
  disabled?: boolean
}

export function FileUploadZone({ onFileSelect, disabled }: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileSelect(acceptedFiles)
    },
    [onFileSelect],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={disabled}>
        <Paperclip className="h-5 w-5" />
        <span className="sr-only">Attach file</span>
      </Button>
    </div>
  )
}
