import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generatePageMetadata("Payment")

  // Hide payment page from search engines
  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}