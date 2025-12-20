import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // First, try to get profile using service role client to avoid RLS recursion
  let serviceClient
  try {
    serviceClient = createServiceRoleClient()
  } catch (serviceError: any) {
    // If service role key is not set, fall back to regular client
    console.warn("Service role key not available, using regular client:", serviceError.message)
    serviceClient = null
  }

  // Try to fetch profile using service role client first (bypasses RLS)
  let profile = null
  let error = null

  if (serviceClient) {
    const { data, error: serviceError } = await serviceClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
    
    profile = data
    error = serviceError
  } else {
    // Fallback to regular client if service role not available
    const { data, error: regularError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
    
    profile = data
    error = regularError
  }

  // If profile doesn't exist, create it using service role client
  if (error && error.code === "PGRST116") {
    try {
      // Get user metadata to determine user type
      const userMetadata = user.user_metadata || {}
      
      // Determine user type from metadata or default to "user"
      let userType = userMetadata.user_type || "user"
      
      // Use service role client to create profile (bypasses RLS)
      const createClient = serviceClient || createServiceRoleClient()
      
      const { data: newProfile, error: createError } = await createClient
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || "",
          name: userMetadata.name || user.email?.split("@")[0] || "User",
          user_type: userType,
          currency: "USD",
          bio: "",
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating profile:", createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      return NextResponse.json({ profile: newProfile })
    } catch (serviceError: any) {
      console.error("Error with service role client:", serviceError)
      return NextResponse.json(
        { error: "Failed to create profile. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment." },
        { status: 500 }
      )
    }
  }

  if (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, bio, profile_image, currency } = body

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (bio !== undefined) updateData.bio = bio
  if (profile_image !== undefined) updateData.profile_image = profile_image
  if (currency !== undefined) updateData.currency = currency

  // Use service role client to bypass RLS and avoid recursion
  let serviceClient
  try {
    serviceClient = createServiceRoleClient()
  } catch (serviceError: any) {
    console.warn("Service role key not available, using regular client:", serviceError.message)
    serviceClient = null
  }

  // Try to update using service role client first (bypasses RLS)
  let profile = null
  let error = null

  if (serviceClient) {
    const { data, error: updateError } = await serviceClient
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single()
    
    profile = data
    error = updateError
  } else {
    // Fallback to regular client if service role not available
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single()
    
    profile = data
    error = updateError
  }

  if (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  return NextResponse.json({ profile })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Delete user's auth account
  const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Delete user's profile (cascade should handle related data)
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Account deleted successfully" })
}

