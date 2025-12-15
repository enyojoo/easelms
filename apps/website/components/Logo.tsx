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
        src="https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20Bk.svg"
        alt="Enthronement University Logo"
        width={180}
        height={60}
        className="h-auto w-auto object-contain block dark:hidden"
        priority
      />
      <Image
        src="https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20wh.svg"
        alt="Enthronement University Logo"
        width={180}
        height={60}
        className="h-auto w-auto object-contain hidden dark:block"
        priority
      />
    </Link>
  )
}
