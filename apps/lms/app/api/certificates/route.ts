import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  // If userId is provided and user is admin, allow fetching other users' certificates
  const targetUserId = userId || user.id

  // Check if user is admin if trying to fetch another user's certificates
  if (userId && userId !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const { data: certificates, error } = await supabase
    .from("certificates")
    .select(`
      *,
      courses (
        id,
        title
      )
    `)
    .eq("user_id", targetUserId)
    .order("issued_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Format certificates to match expected structure
  const formattedCertificates = certificates?.map((cert) => ({
    id: cert.id,
    certificateNumber: cert.certificate_number,
    courseId: cert.course_id,
    courseTitle: cert.courses?.title || "Unknown Course",
    issuedAt: cert.issued_at,
    certificateType: cert.certificate_type || "completion",
  })) || []

  return NextResponse.json({ certificates: formattedCertificates })
}

