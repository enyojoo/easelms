import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("Reset Password")
}

export default function ResetPasswordCodeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
