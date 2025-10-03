"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ThemeToggle({ disableTooltip = false }: { disableTooltip?: boolean }) {
  const { theme, setTheme } = useTheme()

  const buttonContent = (mode: "light" | "dark") => (
    <button
      className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hover:bg-background md:hover:text-foreground ${
        theme === mode ? "bg-background text-foreground shadow-sm" : ""
      }`}
      onClick={() => setTheme(mode)}
    >
      {mode === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )

  if (disableTooltip) {
    return (
      <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        {buttonContent("light")}
        {buttonContent("dark")}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent("light")}</TooltipTrigger>
          <TooltipContent>
            <p>Light</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent("dark")}</TooltipTrigger>
          <TooltipContent>
            <p>Dark</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
