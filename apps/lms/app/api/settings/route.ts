import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile first to get currency preference
    // Use service role client to bypass RLS and avoid recursion
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      console.warn("Service role key not available, using regular client:", serviceError.message)
      serviceClient = null
    }

    let userCurrency = "USD"
    let profile = null
    try {
      // Try service role client first (bypasses RLS)
      if (serviceClient) {
        const { data, error: profileError } = await serviceClient
          .from("profiles")
          .select("user_type, currency")
          .eq("id", user.id)
          .single()
        
        profile = data
        if (profileError && profileError.code !== "PGRST116") {
          console.warn("Error fetching profile with service client:", profileError.message)
        }
      } else {
        // Fallback to regular client
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("user_type, currency")
          .eq("id", user.id)
          .single()
        
        profile = data
        if (profileError && profileError.code !== "PGRST116") {
          console.warn("Error fetching profile:", profileError.message)
        }
      }

      if (profile?.currency) {
        userCurrency = profile.currency
      }

      // Get user settings (if table exists)
      let userSettings = null
      try {
        const { data: settings, error: userSettingsError } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", user.id)
          .single()

        // PGRST116 is "not found" - that's okay, we'll use defaults
        if (!userSettingsError || userSettingsError.code === "PGRST116") {
          userSettings = settings
        } else {
          // Log other errors but don't fail
          console.warn("Error fetching user_settings:", userSettingsError.message)
        }
      } catch (tableError: any) {
        // Table might not exist, that's okay
        console.warn("user_settings table might not exist:", tableError.message)
      }

      // Get platform settings (for admin only)
      let platformSettings = null
      if (profile?.user_type === "admin") {
        try {
          const clientToUse = serviceClient || supabase
          const { data: platform } = await clientToUse
            .from("platform_settings")
            .select("*")
            .single()

          platformSettings = platform
        } catch (platformError: any) {
          // Platform settings table might not exist, that's okay
          if (platformError.code !== "PGRST116") {
            console.warn("platform_settings error:", platformError.message)
          }
        }
      }

      // Return settings with defaults
      return NextResponse.json({
        userSettings: userSettings || {
          email_notifications: true,
          currency: userCurrency,
        },
        platformSettings,
      })
    } catch (profileError: any) {
      console.error("Error fetching profile:", profileError)
      // Return defaults if profile fetch fails
      return NextResponse.json({
        userSettings: {
          email_notifications: true,
          currency: "USD",
        },
        platformSettings: null,
      })
    }
  } catch (error: any) {
    console.error("Settings API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userSettings, platformSettings } = body

    // Update user settings
    if (userSettings) {
      try {
        const { error: userSettingsError } = await supabase
          .from("user_settings")
          .upsert({
            user_id: user.id,
            ...userSettings,
            updated_at: new Date().toISOString(),
          })

        if (userSettingsError) {
          // If table doesn't exist, that's okay - settings are optional
          if (userSettingsError.code === "42P01") {
            // Table doesn't exist
            console.warn("user_settings table doesn't exist, skipping update")
          } else {
            console.error("Error updating user_settings:", userSettingsError)
            return NextResponse.json(
              { error: userSettingsError.message },
              { status: 500 }
            )
          }
        }
      } catch (tableError: any) {
        // Table might not exist, that's okay
        console.warn("user_settings table might not exist:", tableError.message)
      }
    }

    // Update platform settings (admin only)
    if (platformSettings) {
      try {
        // Use service role client to bypass RLS
        let serviceClient
        try {
          serviceClient = createServiceRoleClient()
        } catch (serviceError: any) {
          console.warn("Service role key not available:", serviceError.message)
          serviceClient = null
        }

        const clientToUse = serviceClient || supabase

        const { data: profile } = await clientToUse
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single()

        if (profile?.user_type !== "admin") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { error: platformError } = await clientToUse
          .from("platform_settings")
          .upsert({
            ...platformSettings,
            updated_at: new Date().toISOString(),
          })

        if (platformError) {
          // If table doesn't exist, that's okay
          if (platformError.code === "42P01" || platformError.code === "PGRST116") {
            console.warn("platform_settings table doesn't exist, skipping update")
          } else {
            console.error("Error updating platform_settings:", platformError)
            return NextResponse.json(
              { error: platformError.message },
              { status: 500 }
            )
          }
        }
      } catch (platformTableError: any) {
        console.warn("platform_settings table might not exist:", platformTableError.message)
      }
    }

    return NextResponse.json({ message: "Settings updated successfully" })
  } catch (error: any) {
    console.error("Settings API PUT error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    )
  }
}

