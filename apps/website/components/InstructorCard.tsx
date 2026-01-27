"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ReadMore from "@/components/ReadMore"

interface InstructorCardProps {
  name: string
  title?: string
  image: string
  bio?: string
  className?: string
}

export default function InstructorCard({
  name,
  title = "Course Instructor",
  image,
  bio,
  className,
}: InstructorCardProps) {
  // Validate image - check if it's a string and not empty
  const validImage = typeof image === "string" && image.trim() !== ""
  const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%23f3f4f6' width='80' height='80'/%3E%3C/svg%3E"
  const imageToUse = validImage ? image : placeholderImage

  return (
    <Card className={cn("border", className)}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          {validImage ? (
            <Image
              src={imageToUse}
              alt={name}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No image</span>
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-primary">{name}</h3>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
        {bio && <ReadMore text={bio} maxLength={350} className="mt-4" />}
      </CardContent>
    </Card>
  )
}