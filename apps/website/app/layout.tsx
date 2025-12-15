import type React from "react"
import { Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
})

export const metadata = {
  title: "Enthronement University - Learn. Grow. Succeed.",
  description: "A modern learning management system designed to help you achieve your goals.",
  generator: "Next.js",
  icons: {
    icon: "https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Faviconn.svg",
  },
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
        <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
