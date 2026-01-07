import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

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
      logWarning("Service role key not available, using regular client", {
        component: "settings/route",
        action: "GET",
        error: serviceError.message,
      })
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
          logWarning("Error fetching profile with service client", {
            component: "settings/route",
            action: "GET",
            error: profileError.message,
            userId: user.id,
          })
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
          logWarning("Error fetching profile", {
            component: "settings/route",
            action: "GET",
            error: profileError.message,
            userId: user.id,
          })
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
          logWarning("Error fetching user_settings", {
            component: "settings/route",
            action: "GET",
            error: userSettingsError.message,
            userId: user.id,
          })
        }
      } catch (tableError: any) {
        // Table might not exist, that's okay
        logWarning("user_settings table might not exist", {
          component: "settings/route",
          action: "GET",
          error: tableError.message,
        })
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
            logWarning("platform_settings error", {
              component: "settings/route",
              action: "GET",
              error: platformError.message,
            })
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
      logError("Error fetching profile", profileError, {
        component: "settings/route",
        action: "GET",
        userId: user.id,
      })
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
    logError("Settings API error", error, {
      component: "settings/route",
      action: "GET",
    })
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
            logWarning("user_settings table doesn't exist, skipping update", {
              component: "settings/route",
              action: "PUT",
              userId: user.id,
            })
          } else {
            logError("Error updating user_settings", userSettingsError, {
              component: "settings/route",
              action: "PUT",
              userId: user.id,
            })
            return NextResponse.json(
              { error: userSettingsError.message },
              { status: 500 }
            )
          }
        }
      } catch (tableError: any) {
        // Table might not exist, that's okay
        logWarning("user_settings table might not exist", {
          component: "settings/route",
          action: "GET",
          error: tableError.message,
        })
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
          logWarning("Service role key not available", {
            component: "settings/route",
            action: "PUT",
            error: serviceError.message,
          })
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

        // Check if a platform_settings record already exists
        const { data: existingSettings, error: fetchError } = await clientToUse
          .from("platform_settings")
          .select("id")
          .limit(1)
          .single()

        if (fetchError && fetchError.code !== "PGRST116") {
          // PGRST116 is "not found" - that's okay, we'll insert
          // Other errors should be logged
          logWarning("Error fetching existing platform_settings", {
            component: "settings/route",
            action: "PUT",
            error: fetchError.message,
            userId: user.id,
          })
        }

        let platformError
        if (existingSettings?.id) {
          // Update existing record
          const { error: updateError } = await clientToUse
            .from("platform_settings")
            .update({
              ...platformSettings,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSettings.id)

          platformError = updateError
        } else {
          // Insert new record (should only happen once)
          const { error: insertError } = await clientToUse
            .from("platform_settings")
            .insert({
              ...platformSettings,
              updated_at: new Date().toISOString(),
            })

          platformError = insertError
        }

        if (platformError) {
          // If table doesn't exist, that's okay - just log and continue
          if (platformError.code === "42P01" || platformError.code === "PGRST116" || platformError.message?.includes("schema cache")) {
            logWarning("platform_settings table doesn't exist, skipping update", {
              component: "settings/route",
              action: "PUT",
              userId: user.id,
            })
            // Don't return error, just skip the update
          } else {
            logError("Error updating platform_settings", platformError, {
              component: "settings/route",
              action: "PUT",
              userId: user.id,
            })
            // Don't fail the request if platform_settings table doesn't exist
            if (!platformError.message?.includes("schema cache")) {
              return NextResponse.json(
                { error: platformError.message },
                { status: 500 }
              )
            }
          }
        }
      } catch (platformTableError: any) {
        logWarning("platform_settings table might not exist", {
          component: "settings/route",
          action: "PUT",
          error: platformTableError.message,
        })
      }
    }

    return NextResponse.json({ message: "Settings updated successfully" })
  } catch (error: any) {
    logError("Settings API PUT error", error, {
      component: "settings/route",
      action: "PUT",
    })
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    )
  }
}

