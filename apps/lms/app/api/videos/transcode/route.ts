import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logError, logInfo } from "@/lib/utils/errorHandler"
import { createMediaConvertJob } from "@/lib/aws/mediaconvert"
import { getHLSVideoUrl } from "@/lib/aws/s3"

/**
 * Transcode video to HLS format with multiple bitrates using AWS MediaConvert
 * POST /api/videos/transcode
 * Body: { videoKey: string }
 * 
 * This creates an async MediaConvert job. The job will process the video
 * and upload HLS files to S3 automatically.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoKey } = await request.json()

    if (!videoKey || typeof videoKey !== 'string') {
      return NextResponse.json({ error: "videoKey is required" }, { status: 400 })
    }

    // Check required environment variables
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logError("AWS credentials not configured", new Error("Missing AWS credentials"), {
        videoKey,
        userId: user.id,
      })
      
      return NextResponse.json(
        { 
          error: "AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.",
          requiresAWS: true
        },
        { status: 503 }
      )
    }

    if (!process.env.AWS_S3_BUCKET_NAME) {
      logError("S3 bucket not configured", new Error("Missing S3 bucket name"), {
        videoKey,
        userId: user.id,
      })
      
      return NextResponse.json(
        { 
          error: "S3 bucket not configured. Please set AWS_S3_BUCKET_NAME environment variable.",
          requiresS3: true
        },
        { status: 503 }
      )
    }

    logInfo("🚀 Starting MediaConvert transcoding job", {
      videoKey,
      userId: user.id,
      timestamp: new Date().toISOString(),
    })
    
    console.log("🎬 MediaConvert HLS Transcoding Started:", {
      videoKey,
      userId: user.id,
      time: new Date().toISOString(),
    })

    try {
      // Create MediaConvert job (async - will process in background)
      const jobId = await createMediaConvertJob(videoKey)

      // Generate expected HLS manifest URL (will be available once job completes)
      const hlsManifestUrl = getHLSVideoUrl(videoKey)

      logInfo("✅ MediaConvert job created successfully", {
        jobId,
        videoKey,
        hlsManifestUrl,
        timestamp: new Date().toISOString(),
      })
      
      console.log("🎬 MediaConvert Job Created:", {
        jobId,
        videoKey,
        hlsUrl: hlsManifestUrl,
        note: "Job is processing in background. HLS files will be available once job completes.",
      })

      return NextResponse.json({
        success: true,
        jobId,
        hlsUrl: hlsManifestUrl, // Expected URL (will be available after job completes)
        videoKey,
        status: "processing",
        message: "Transcoding job created successfully. HLS files will be available once processing completes.",
      })
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create MediaConvert job"
      
      logError("MediaConvert job creation error", error, {
        videoKey,
        userId: user.id,
        errorMessage,
      })

      // Check for specific MediaConvert errors
      if (errorMessage.includes('Role') || errorMessage.includes('IAM')) {
        return NextResponse.json(
          { 
            error: "MediaConvert IAM role not configured. Please set AWS_MEDIACONVERT_ROLE_ARN environment variable.",
            requiresIAM: true,
            details: errorMessage
          },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorMessage
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logError("Unexpected transcoding error", error, {})
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
