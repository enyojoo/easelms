import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logInfo } from "@/lib/utils/errorHandler"

export const dynamic = 'force-dynamic'

// GET - Fetch all instructors
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client to bypass RLS for checking permissions
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      logError("Service role key not available", serviceError, {
        component: "instructors/route",
        action: "GET",
      })
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check if user is admin or instructor (use service client to bypass RLS)
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Use service role client to bypass RLS for fetching instructors
    const serviceSupabase = serviceClient

    const { data: instructors, error } = await serviceSupabase
      .from("instructors")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      logError("Error fetching instructors", error, {
        component: "instructors/route",
        action: "GET",
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instructors: instructors || [] })
  } catch (error: any) {
    logError("Error in instructors GET", error, {
      component: "instructors/route",
      action: "GET",
    })
    return NextResponse.json(
      { error: error.message || "Failed to fetch instructors" },
      { status: 500 }
    )
  }
}

// POST - Create a new instructor
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client to bypass RLS for checking permissions
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      logError("Service role key not available", serviceError, {
        component: "instructors/route",
        action: "POST",
      })
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check if user is admin or instructor (use service client to bypass RLS)
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { name, image, bio } = await request.json()

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Instructor name is required" },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS
    const serviceSupabase = serviceClient

    const { data: instructor, error } = await serviceSupabase
      .from("instructors")
      .insert({
        name: name.trim(),
        image: image && image.trim() !== "" ? image.trim() : null,
        bio: bio && bio.trim() !== "" ? bio.trim() : null,
      })
      .select()
      .single()

    if (error) {
      logError("Error creating instructor", error, {
        component: "instructors/route",
        action: "POST",
        name,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logInfo("Instructor created", { instructorId: instructor.id, name })
    return NextResponse.json({ instructor }, { status: 201 })
  } catch (error: any) {
    logError("Error in instructors POST", error, {
      component: "instructors/route",
      action: "POST",
    })
    return NextResponse.json(
      { error: error.message || "Failed to create instructor" },
      { status: 500 }
    )
  }
}
