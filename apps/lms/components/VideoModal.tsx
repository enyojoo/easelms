"use client"

import type React from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { extractVimeoId, getVimeoEmbedUrl } from "@/lib/vimeo/utils"
import VideoPreviewPlayer from "@/components/VideoPreviewPlayer"

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title: string
  vimeoVideoId?: string
}

export default function VideoModal({ isOpen, onClose, videoUrl, title, vimeoVideoId }: VideoModalProps) {
  const vimeoId = vimeoVideoId || (videoUrl ? extractVimeoId(videoUrl) : null)
  const isVimeoVideo = !!vimeoId

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 sm:rounded-t-lg sm:rounded-b-none overflow-hidden [&>button]:rounded-t-lg">
        <div className="p-4 border-b">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Course Preview</div>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </div>
        </div>

        <div className="relative bg-black w-full overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '400px' }}>
          {isVimeoVideo && vimeoId ? (
            <iframe
              src={getVimeoEmbedUrl(vimeoId, { autoplay: isOpen, controls: true, responsive: true })}
              className="w-full h-full absolute inset-0"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={title}
            />
          ) : videoUrl ? (
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
