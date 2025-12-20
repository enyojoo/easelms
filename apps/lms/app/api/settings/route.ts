import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user settings
  const { data: userSettings, error: userSettingsError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (userSettingsError && userSettingsError.code !== "PGRST116") {
    // PGRST116 is "not found" - we'll create defaults
    return NextResponse.json({ error: userSettingsError.message }, { status: 500 })
  }

  // Get platform settings (for admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  let platformSettings = null
  if (profile?.user_type === "admin") {
    const { data: platform } = await supabase
      .from("platform_settings")
      .select("*")
      .single()

    platformSettings = platform
  }

  return NextResponse.json({
    userSettings: userSettings || {
      email_notifications: true,
      currency: "USD",
    },
    platformSettings,
  })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { userSettings, platformSettings } = body

  // Update user settings
  if (userSettings) {
    const { error: userSettingsError } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        ...userSettings,
        updated_at: new Date().toISOString(),
      })

    if (userSettingsError) {
      return NextResponse.json({ error: userSettingsError.message }, { status: 500 })
    }
  }

  // Update platform settings (admin only)
  if (platformSettings) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error: platformError } = await supabase
      .from("platform_settings")
      .upsert({
        ...platformSettings,
        updated_at: new Date().toISOString(),
      })

    if (platformError) {
      return NextResponse.json({ error: platformError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ message: "Settings updated successfully" })
}

