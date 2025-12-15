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
        src="https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20B.svg"
        alt="Enthronement University Logo"
        width={120}
        height={40}
        className="h-auto w-auto object-contain block dark:hidden"
        priority
      />
      <Image
        src="https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20W.svg"
        alt="Enthronement University Logo"
        width={120}
        height={40}
        className="h-auto w-auto object-contain hidden dark:block"
        priority
      />
    </Link>
  )
}
