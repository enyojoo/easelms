import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, MapPin } from "lucide-react"

interface Workshop {
  id: number
  title: string
  date: string
  time: string
  attendees: number
  isOnline: boolean
  address?: string
  description: string
}

interface WorkshopPreviewModalProps {
  workshop: Workshop
  onClose: () => void
}

export default function WorkshopPreviewModal({ workshop, onClose }: WorkshopPreviewModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{workshop.title}</DialogTitle>
          <DialogDescription>Workshop Details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            <span>{workshop.date}</span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            <span>{workshop.time}</span>
          </div>
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            <span>{workshop.attendees} attendees</span>
          </div>
          {!workshop.isOnline && (
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              <span>{workshop.address}</span>
            </div>
          )}
          <p>{workshop.description}</p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
