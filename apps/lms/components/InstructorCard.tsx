"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
  return (
    <Card className={cn("border", className)}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Image
            src={image}
            alt={name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <h3 className="text-xl font-bold text-primary">{name}</h3>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
        {bio && <p className="text-sm text-muted-foreground">{bio}</p>}
      </CardContent>
    </Card>
  )
}

