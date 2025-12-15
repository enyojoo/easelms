"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Twitter, Linkedin, Youtube, Instagram, LinkIcon as Website } from "lucide-react"
import { cn } from "@/lib/utils"

interface InstructorCardProps {
  name: string
  title?: string
  image: string
  bio?: string
  website?: string
  twitter?: string
  linkedin?: string
  youtube?: string
  instagram?: string
  className?: string
}

export default function InstructorCard({
  name,
  title = "Course Instructor",
  image,
  bio,
  website,
  twitter,
  linkedin,
  youtube,
  instagram,
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
        {bio && <p className="text-sm text-muted-foreground mb-4">{bio}</p>}
        <div className="flex space-x-2">
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Website"
            >
              <Website className="w-5 h-5" />
            </a>
          )}
          {twitter && (
            <a
              href={`https://twitter.com/${twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
          )}
          {linkedin && (
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          )}
          {youtube && (
            <a
              href={youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="YouTube"
            >
              <Youtube className="w-5 h-5" />
            </a>
          )}
          {instagram && (
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

