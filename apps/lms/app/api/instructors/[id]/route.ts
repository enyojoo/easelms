import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logInfo } from "@/lib/utils/errorHandler"

export const dynamic = 'force-dynamic'

// PUT - Update an instructor
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
        component: "instructors/[id]/route",
        action: "PUT",
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
      .update({
        name: name.trim(),
        image: image && image.trim() !== "" ? image.trim() : null,
        bio: bio && bio.trim() !== "" ? bio.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      logError("Error updating instructor", error, {
        component: "instructors/[id]/route",
        action: "PUT",
        instructorId: id,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logInfo("Instructor updated", { instructorId: id, name })
    return NextResponse.json({ instructor })
  } catch (error: any) {
    logError("Error in instructors PUT", error, {
      component: "instructors/[id]/route",
      action: "PUT",
    })
    return NextResponse.json(
      { error: error.message || "Failed to update instructor" },
      { status: 500 }
    )
  }
}

// DELETE - Delete an instructor
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
        component: "instructors/[id]/route",
        action: "DELETE",
      })
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check if user is admin (use service client to bypass RLS)
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Use service role client to bypass RLS
    const serviceSupabase = serviceClient

    // Check if instructor is used in any courses
    const { data: courseInstructors } = await serviceSupabase
      .from("course_instructors")
      .select("course_id")
      .eq("instructor_id", id)
      .limit(1)

    if (courseInstructors && courseInstructors.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete instructor that is assigned to courses" },
        { status: 400 }
      )
    }

    const { error } = await serviceSupabase
      .from("instructors")
      .delete()
      .eq("id", id)

    if (error) {
      logError("Error deleting instructor", error, {
        component: "instructors/[id]/route",
        action: "DELETE",
        instructorId: id,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logInfo("Instructor deleted", { instructorId: id })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logError("Error in instructors DELETE", error, {
      component: "instructors/[id]/route",
      action: "DELETE",
    })
    return NextResponse.json(
      { error: error.message || "Failed to delete instructor" },
      { status: 500 }
    )
  }
}
