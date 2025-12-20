import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  variant?: "full" | "icon"
}

export default function Logo({ className = "", variant = "full" }: LogoProps) {
  if (variant === "icon") {
    // Mobile header icon variant
    return (
      <Link href="/" className={cn("flex items-center", className)}>
        <Image
          src="https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Faviconb.svg"
          alt="Enthronement University Logo"
          width={40}
          height={40}
          className="h-auto w-auto object-contain block dark:hidden"
          priority
        />
        <Image
          src="https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Faviconn.svg"
          alt="Enthronement University Logo"
          width={40}
          height={40}
          className="h-auto w-auto object-contain hidden dark:block"
          priority
        />
      </Link>
    )
  }

  // Full logo variant (default)
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
