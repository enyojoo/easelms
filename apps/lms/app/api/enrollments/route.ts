import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error("Enrollments API: Auth error", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try to fetch enrollments - handle RLS issues gracefully
    let { data, error } = await supabase
      .from("enrollments")
      .select(`
        *,
        courses (*)
      `)
      .eq("user_id", user.id)

    // If error, try without the courses relation (might be RLS issue)
    if (error) {
      console.warn("Enrollments API: Error with courses relation, trying without:", error.message)
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
      
      if (!enrollmentsError) {
        data = enrollmentsData
        error = null
      } else {
        console.error("Enrollments API: Database error", {
          error: enrollmentsError,
          code: enrollmentsError.code,
          message: enrollmentsError.message,
          details: enrollmentsError.details,
          hint: enrollmentsError.hint,
          userId: user.id,
        })
        return NextResponse.json({ 
          error: enrollmentsError.message,
          details: enrollmentsError.details,
          hint: enrollmentsError.hint,
        }, { status: 500 })
      }
    }

    if (error) {
      console.error("Enrollments API: Database error", {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: user.id,
      })
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
      }, { status: 500 })
    }

    // Return empty array if no enrollments (not an error)
    return NextResponse.json({ enrollments: data || [] })
  } catch (error: any) {
    console.error("Enrollments API: Unexpected error", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json({ 
      error: error?.message || "An unexpected error occurred while fetching enrollments",
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { courseId } = await request.json()

  const { data, error } = await supabase
    .from("enrollments")
    .insert({
      user_id: user.id,
      course_id: courseId,
      status: "active",
      progress: 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enrollment: data })
}

