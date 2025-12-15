import Image from "next/image"
import Link from "next/link"

interface LogoProps {
  className?: string
}

export default function Logo({ className = "" }: LogoProps) {
  return (
    <Link href="/">
      <Image
        src="https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20B.svg"
        alt="Enthronement University Logo"
        width={120}
        height={40}
        className={`${className} object-contain block dark:hidden`}
      />
      <Image
        src="https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20W.svg"
        alt="Enthronement University Logo"
        width={120}
        height={40}
        className={`${className} object-contain hidden dark:block`}
      />
    </Link>
  )
}
