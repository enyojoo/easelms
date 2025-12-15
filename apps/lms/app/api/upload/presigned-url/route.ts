import { createClient } from "@/lib/supabase/server"
import { getPresignedUrl } from "@/lib/aws/s3"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { key, expiresIn } = await request.json()

  if (!key) {
    return NextResponse.json({ error: "Key is required" }, { status: 400 })
  }

  try {
    const url = await getPresignedUrl(key, expiresIn || 3600)
    return NextResponse.json({ url })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate presigned URL" },
      { status: 500 }
    )
  }
}

