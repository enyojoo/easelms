"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Resource } from "./ResourceManager"
import Image from "next/image"

interface ResourcePreviewProps {
  resource: Resource
  onClose: () => void
}

export default function ResourcePreview({ resource, onClose }: ResourcePreviewProps) {
  const isImage = resource.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const isPDF = resource.url.match(/\.(pdf)$/i)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{resource.title || "Resource Preview"}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {isImage ? (
            <div className="relative w-full h-[60vh]">
              <Image
                src={resource.url}
                alt={resource.title || "Resource"}
                fill
                className="object-contain"
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={resource.url}
              className="w-full h-[60vh] border rounded"
              title={resource.title}
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Preview not available for this file type</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.open(resource.url, "_blank")}
              >
                Open in New Tab
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

