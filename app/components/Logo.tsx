import Image from "next/image"
import Link from "next/link"

interface LogoProps {
  className?: string
}

export default function Logo({ className = "" }: LogoProps) {
  return (
    <Link href="/">
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Easner%20Logobk-o4FCA9xAbfVjAP0quynvrpsHMrcMsl.svg"
        alt="EaseLMS Logo"
        width={120}
        height={40}
        className={`${className} object-contain block dark:hidden`}
      />
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Easner%20LogoWh-hTyWcV5fCe3avnPjPxvyKz5ovra975.svg"
        alt="EaseLMS Logo"
        width={120}
        height={40}
        className={`${className} object-contain hidden dark:block`}
      />
    </Link>
  )
}
