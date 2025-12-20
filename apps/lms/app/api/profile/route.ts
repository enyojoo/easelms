import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error("Profile API: Auth error", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

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

    // Log error details for debugging
    if (error) {
      console.error("Profile API GET error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: user.id,
      })
    }

    // If profile doesn't exist, try to create it
    // BUT: If we get a constraint violation, the profile might exist with invalid data
    // In that case, we should return an error rather than trying to fix it automatically
    if (error && (error.code === "PGRST116" || error.code === "23514")) {
      // PGRST116 = no rows returned (profile doesn't exist)
      // 23514 = check constraint violation (might mean profile exists with invalid data)
      
      // First, check if profile actually exists (maybe with invalid user_type)
      let existingProfile = null
      if (serviceClient) {
        const { data: checkProfile } = await serviceClient
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()
        existingProfile = checkProfile
      }
      
      if (existingProfile) {
        // Profile exists but might have invalid user_type - try to fix it
        console.log("Profile exists but may have invalid user_type, attempting to fix:", existingProfile.user_type)
        const { data: updatedProfile, error: updateError } = await serviceClient
          .from("profiles")
          .update({ user_type: "user" })
          .eq("id", user.id)
          .select()
          .single()
        
        if (!updateError && updatedProfile) {
          return NextResponse.json({ profile: updatedProfile })
        }
      }
      try {
        // Get user metadata
        const userMetadata = user.user_metadata || {}
        
        // Use service role client to create profile (bypasses RLS)
        const createClient = serviceClient || createServiceRoleClient()
        
        // Try to insert with minimal required fields
        // Use raw SQL-like approach: set user_type as a string literal directly
        const insertPayload = {
          id: user.id,
          email: user.email || "",
          name: userMetadata.name || user.email?.split("@")[0] || "User",
          user_type: "user", // String literal - must match database constraint exactly
          currency: "USD",
          bio: "",
        }
        
        console.log("Profile API: Attempting to create profile", {
          userId: user.id,
          email: user.email,
          payload: { ...insertPayload, id: insertPayload.id.substring(0, 8) + "..." },
        })
        
        // Try UPSERT first (handles both insert and update)
        let newProfile = null
        let createError = null
        
        const { data: upsertData, error: upsertErr } = await createClient
          .from("profiles")
          .upsert(insertPayload, {
            onConflict: "id",
          })
          .select()
          .single()
        
        if (upsertErr) {
          // If UPSERT fails, try regular INSERT
          console.log("UPSERT failed, trying INSERT:", upsertErr.message)
          const { data: insertData, error: insertErr } = await createClient
            .from("profiles")
            .insert(insertPayload)
            .select()
            .single()
          
          newProfile = insertData
          createError = insertErr
        } else {
          newProfile = upsertData
        }

        if (createError) {
          // If it's a constraint violation on user_type, try to query what the constraint expects
          if (createError.message?.includes("profiles_user_type_check")) {
            console.error("CRITICAL: Database constraint violation even with user_type='user'", {
              error: createError,
              payload: insertPayload,
            })
            
            // The constraint is rejecting "user" - this means the constraint definition is different
            // Return error with instructions to fix the database
            return NextResponse.json({ 
              error: "Database constraint violation: profiles_user_type_check is rejecting 'user'.",
              message: "The database constraint definition is incorrect. Run fix_profiles_constraint.sql in Supabase SQL Editor to fix it.",
              hint: "The constraint should allow 'user' and 'admin'. See apps/lms/fix_profiles_constraint.sql",
              details: createError.details,
            }, { status: 500 })
          }
          
          console.error("Error creating profile:", createError)
          return NextResponse.json({ 
            error: createError.message,
            details: createError.details,
            hint: createError.hint,
          }, { status: 500 })
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
      console.error("Error fetching profile:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      // Ensure we always return a proper error message
      const errorMessage = error.message || "Failed to fetch profile"
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    if (!profile) {
      console.warn("Profile not found for user:", user.id)
      // Try to create profile if it doesn't exist
      // This should have been handled above, but just in case
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    // Catch any unhandled exceptions
    console.error("Profile API GET: Unhandled error", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { 
        error: error?.message || "An unexpected error occurred while fetching profile",
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
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

