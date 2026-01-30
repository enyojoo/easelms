import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logError } from "@/lib/utils/errorHandler"
import { getMediaConvertJobStatus } from "@/lib/aws/mediaconvert"

/**
 * Get MediaConvert job status
 * GET /api/videos/transcode/status?jobId=xxx
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 })
    }

    const status = await getMediaConvertJobStatus(jobId)

    return NextResponse.json({
      jobId,
      ...status,
    })
  } catch (error: any) {
    logError("Failed to get MediaConvert job status", error, {})
    return NextResponse.json(
      { error: error.message || "Failed to get job status" },
      { status: 500 }
    )
  }
}
