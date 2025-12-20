import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (profile?.user_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, userType, bio, profile_image, currency } = body

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (email !== undefined) updateData.email = email
  if (userType !== undefined) updateData.user_type = userType
  if (bio !== undefined) updateData.bio = bio
  if (profile_image !== undefined) updateData.profile_image = profile_image
  if (currency !== undefined) updateData.currency = currency

  // Update profile
  const { data: updatedProfile, error: profileError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Update email in auth if provided
  if (email) {
    const { error: authError } = await supabase.auth.admin.updateUserById(params.id, {
      email,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ user: updatedProfile })
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (profile?.user_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Prevent deleting yourself
  if (params.id === user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    )
  }

  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(params.id)

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Delete profile (cascade should handle related data)
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", params.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "User deleted successfully" })
}

