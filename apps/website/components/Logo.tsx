import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
}

export default function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Easner%20Logobk-o4FCA9xAbfVjAP0quynvrpsHMrcMsl.svg"
        alt="Enthronement University Logo"
        width={120}
        height={40}
        className="h-auto w-auto object-contain block dark:hidden"
        priority
      />
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Easner%20LogoWh-hTyWcV5fCe3avnPjPxvyKz5ovra975.svg"
        alt="Enthronement University Logo"
        width={120}
        height={40}
        className="h-auto w-auto object-contain hidden dark:block"
        priority
      />
    </Link>
  )
}
