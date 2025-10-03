import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock, Calendar, Users, MapPin, Globe, Banknote } from "lucide-react"

interface Workshop {
  id: number
  title: string
  date: string
  time: string
  attendees: number
  isOnline: boolean
  address?: string
  description: string
  price: number
}

interface WorkshopPreviewModalProps {
  workshop: Workshop
  isOpen: boolean
  onClose: () => void
}

export default function WorkshopPreviewModal({ workshop, isOpen, onClose }: WorkshopPreviewModalProps) {
  const handleRegister = () => {
    // Implement registration logic here
    console.log("Registering for workshop:", workshop.id)
    // You might want to call an API to register the user for the workshop
    // and then close the modal or show a confirmation message
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{workshop.title}</DialogTitle>
          <DialogDescription>Workshop Preview</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
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
            <div className="flex items-center">
              {workshop.isOnline ? <Globe className="mr-2 h-4 w-4" /> : <MapPin className="mr-2 h-4 w-4" />}
              <span>{workshop.isOnline ? "Online" : workshop.address}</span>
            </div>
            <div className="flex items-center">
              <Banknote className="mr-2 h-4 w-4" />
              <span>${workshop.price}</span>
            </div>
          </div>
          <p className="text-sm">{workshop.description}</p>
        </div>
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleRegister}>Register</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
