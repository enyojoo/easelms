"use client"

import { Card, CardContent } from "@/components/ui/card"
import SafeImage from "@/components/SafeImage"

interface InstructorCardProps {
  name: string
  image: string
  bio: string
  title: string
  className?: string
}

export default function InstructorCard({ name, image, bio, title, className }: InstructorCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <SafeImage
              src={image || "/placeholder.svg"}
              alt={name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{name}</h3>
            <p className="text-primary font-medium mb-3">{title}</p>
            {bio && (
              <p className="text-muted-foreground leading-relaxed">{bio}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}