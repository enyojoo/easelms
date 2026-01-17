import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Get platform settings (public endpoint)
export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch public platform settings from database
    const { data: settings, error } = await supabase
      .from("platform_settings")
      .select("default_currency, platform_name, platform_description")
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching platform settings:", error)
    }

    // Return settings with fallbacks
    const platformSettings = {
      default_currency: settings?.default_currency || "USD",
      platform_name: settings?.platform_name || "EaseLMS",
      platform_description: settings?.platform_description || "Modern Learning Management System",
    }

    return NextResponse.json(platformSettings)
  } catch (error: any) {
    console.error("Error fetching platform settings:", error)
    return NextResponse.json(
      {
        default_currency: "USD",
        platform_name: "EaseLMS",
        platform_description: "Modern Learning Management System"
      },
      { status: 200 } // Return defaults even on error
    )
  }
}