import type React from "react"
import { Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { QueryProvider } from "@/lib/QueryProvider"
import { Metadata } from "next"

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
})

// This will be overridden by dynamic metadata in pages that need it
export const metadata: Metadata = {
  title: "EaseLMS - Learn. Grow. Succeed.",
  description: "EaseLMS is a modern, open-source Learning Management System built with modern tech stack. It provides a complete solution for creating, managing, and delivering online courses.",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const storageKey = 'ui-theme';
                const theme = localStorage.getItem(storageKey) || 'dark';
                let rootClass = '';
                
                if (theme === 'system') {
                  rootClass = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } else {
                  rootClass = theme;
                }
                
                if (rootClass) {
                  document.documentElement.classList.add(rootClass);
                }
              })();
            `,
          }}
        />
        <QueryProvider>
          <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
