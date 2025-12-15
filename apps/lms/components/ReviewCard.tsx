"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReviewCardProps {
  reviewerName: string
  reviewerImage?: string
  rating: number
  reviewText: string
  date: string
  className?: string
}

export default function ReviewCard({
  reviewerName,
  reviewerImage,
  rating,
  reviewText,
  date,
  className,
}: ReviewCardProps) {
  return (
    <Card className={cn("border", className)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={reviewerImage} alt={reviewerName} />
            <AvatarFallback>{reviewerName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{reviewerName}</p>
                <p className="text-xs text-muted-foreground">{date}</p>
              </div>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{reviewText}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

