import { createClient } from "@/lib/supabase/server"
import { uploadFile, getPublicUrl } from "@/lib/aws/s3"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File
  const folder = formData.get("folder") as string || "uploads"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const key = `${folder}/${user.id}/${timestamp}-${file.name}`

    await uploadFile(buffer, key, file.type)
    const url = getPublicUrl(key)

    return NextResponse.json({ url, key })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
}

