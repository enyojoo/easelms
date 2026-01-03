"use client"

import type React from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import VideoPreviewPlayer from "@/components/VideoPreviewPlayer"

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title: string
}

export default function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!left-4 !right-4 !top-[50%] !-translate-y-1/2 !translate-x-0 max-w-none w-[calc(100vw-2rem)] sm:!left-[50%] sm:!right-auto sm:!top-[50%] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:w-full sm:max-w-[800px] p-0 sm:rounded-t-lg sm:rounded-b-none overflow-hidden rounded-lg [&>button]:rounded-t-lg">
        <div className="p-4 border-b">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Course Preview</div>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </div>
        </div>

        <div className="relative bg-black w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {videoUrl ? (
            <div className="w-full h-full absolute inset-0">
              <VideoPreviewPlayer
                key={videoUrl}
                src={videoUrl}
                className="w-full h-full"
                autoplay={isOpen}
                showControlsOnHover={true}
              />
            </div>
          ) : (
            <div className="w-full h-full absolute inset-0 flex items-center justify-center">
              <p className="text-white">No video available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
