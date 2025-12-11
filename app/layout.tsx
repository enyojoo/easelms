import type React from "react"
import { Poppins } from "next/font/google"
import "./globals.css"
import ClientLayout from "./components/ClientLayout"

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
})

export const metadata = {
  title: "Enthronement University - Learning Management System",
  description: "A modern, easy-to-use Learning Management System for creating and managing courses and educational content.",
  generator: "Next.js",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} bg-background text-text-primary`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
