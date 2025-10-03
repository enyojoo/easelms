import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface Workshop {
  id: number
  title: string
  date: string
  time: string
  isOnline: boolean
  address?: string
  description: string
  price: number
}

interface WorkshopCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (newWorkshop: Omit<Workshop, "id">) => void
}

export default function WorkshopCreateModal({ isOpen, onClose, onSave }: WorkshopCreateModalProps) {
  const [newWorkshop, setNewWorkshop] = useState<Omit<Workshop, "id">>({
    title: "",
    date: "",
    time: "",
    isOnline: true,
    description: "",
    price: 0,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewWorkshop((prev) => ({
      ...prev,
      [name]: name === "price" ? Number.parseFloat(value) : value,
    }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setNewWorkshop((prev) => ({ ...prev, isOnline: checked }))
  }

  const handleSave = () => {
    onSave(newWorkshop)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Workshop</DialogTitle>
          <DialogDescription>Enter the details for your new workshop.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" value={newWorkshop.title} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" value={newWorkshop.date} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" name="time" type="time" value={newWorkshop.time} onChange={handleInputChange} />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="isOnline" checked={newWorkshop.isOnline} onCheckedChange={handleSwitchChange} />
            <Label htmlFor="isOnline">Online Workshop</Label>
          </div>
          {!newWorkshop.isOnline && (
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={newWorkshop.address} onChange={handleInputChange} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={newWorkshop.description}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              name="price"
              type="number"
              value={newWorkshop.price}
              onChange={handleInputChange}
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Create Workshop</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
