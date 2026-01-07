import { createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning } from "@/lib/utils/errorHandler"

/**
 * Public API endpoint to fetch brand settings
 * This endpoint does not require authentication and is used on auth pages
 * and other public pages to display branding
 */
export async function GET() {
  try {
    // Use service role client to bypass RLS and fetch platform settings
    const supabase = createServiceRoleClient()
    
    const { data: platformSettings, error } = await supabase
      .from("platform_settings")
      .select("*")
      .single()

    // If no record exists or error (PGRST116 is "not found"), return null
    if (error && error.code !== "PGRST116") {
      logWarning("Error fetching platform_settings for brand settings", {
        component: "brand-settings/route",
        action: "GET",
        error: error.message,
      })
    }

    return NextResponse.json({
      platformSettings: platformSettings || null,
    })
  } catch (error: any) {
    logError("Brand settings API error", error, {
      component: "brand-settings/route",
      action: "GET",
    })
    // Return null on error so components can use defaults
    return NextResponse.json({
      platformSettings: null,
    })
  }
}
