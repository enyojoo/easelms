import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("Purchase")
}

export default function PurchaseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
