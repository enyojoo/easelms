import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { logError, logInfo } from "@/lib/utils/errorHandler"
import { getHLSVideoUrl } from "@/lib/aws/s3"
import { spawn } from "child_process"
import { createWriteStream, unlinkSync, existsSync, mkdirSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!

/**
 * Transcode video to HLS format with multiple bitrates
 * POST /api/videos/transcode
 * Body: { videoKey: string }
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

    // Check if FFmpeg is available
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'
    
    logInfo("🚀 Starting video transcoding", {
      videoKey,
      userId: user.id,
      ffmpegPath,
      timestamp: new Date().toISOString(),
    })
    
    // Also log to console for immediate visibility
    console.log("🎬 HLS Transcoding Started:", {
      videoKey,
      userId: user.id,
      time: new Date().toISOString(),
    })

    // Create temporary directories
    const tempDir = join(tmpdir(), `hls-transcode-${Date.now()}`)
    const inputPath = join(tempDir, 'input.mp4')
    const outputDir = join(tempDir, 'hls')

    mkdirSync(tempDir, { recursive: true })
    mkdirSync(outputDir, { recursive: true })

    try {
      // Download video from S3
      logInfo("Downloading video from S3", { videoKey })
      const getObjectCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: videoKey,
      })

      const response = await s3Client.send(getObjectCommand)
      const stream = response.Body as NodeJS.ReadableStream

      // Write to temporary file
      const writeStream = createWriteStream(inputPath)
      await new Promise((resolve, reject) => {
        stream.pipe(writeStream)
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })

      logInfo("Video downloaded, starting FFmpeg transcoding", { inputPath })

      // Transcode to HLS with multiple bitrates
      // Creates: master.m3u8, and segment files for each quality
      const masterPlaylistPath = join(outputDir, 'master.m3u8')
      
      // Use FFmpeg's hls variant playlist feature for multiple bitrates
      const ffmpegArgs = [
        '-i', inputPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-hls_time', '10',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', join(outputDir, 'segment_%03d_%v.ts'),
        // Multiple bitrates: 1080p (5Mbps), 720p (3Mbps), 480p (1.5Mbps)
        '-map', '0:v:0', '-map', '0:a:0',
        '-b:v:0', '5000k', '-s:v:0', '1920x1080', '-b:a:0', '192k',
        '-map', '0:v:0', '-map', '0:a:0',
        '-b:v:1', '3000k', '-s:v:1', '1280x720', '-b:a:1', '128k',
        '-map', '0:v:0', '-map', '0:a:0',
        '-b:v:2', '1500k', '-s:v:2', '854x480', '-b:a:2', '96k',
        '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2',
        '-master_pl_name', 'master.m3u8',
        '-f', 'hls',
        '-hls_flags', 'independent_segments',
        join(outputDir, 'stream_%v.m3u8'),
      ]

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        let stdout = ''
        let stderr = ''

        ffmpeg.stdout?.on('data', (data) => {
          stdout += data.toString()
        })

        ffmpeg.stderr?.on('data', (data) => {
          stderr += data.toString()
        })

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            logInfo("FFmpeg transcoding completed", { code, stdout: stdout.slice(0, 500) })
            resolve()
          } else {
            logError("FFmpeg transcoding failed", new Error(stderr), { code, stderr: stderr.slice(0, 1000) })
            reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(0, 500)}`))
          }
        })

        ffmpeg.on('error', (error) => {
          logError("FFmpeg spawn error", error, { ffmpegPath })
          reject(error)
        })
      })

      // Upload HLS files to S3
      logInfo("Uploading HLS files to S3", { outputDir })
      
      // Read all files in output directory
      const { readdirSync, readFileSync } = await import('fs')
      const files = readdirSync(outputDir)

      // Determine HLS path in S3 (same path as original video with /hls/ subdirectory)
      const lastSlashIndex = videoKey.lastIndexOf('/')
      const videoPath = lastSlashIndex >= 0 ? videoKey.substring(0, lastSlashIndex) : ''
      const filename = lastSlashIndex >= 0 ? videoKey.substring(lastSlashIndex + 1) : videoKey
      const baseName = filename.replace(/\.[^/.]+$/, '')
      const hlsBasePath = videoPath ? `${videoPath}/hls/${baseName}` : `hls/${baseName}`

      // Upload each file
      for (const file of files) {
        const filePath = join(outputDir, file)
        const fileContent = readFileSync(filePath)
        const s3Key = `${hlsBasePath}/${file}`

        const putObjectCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: fileContent,
          ContentType: file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
        })

        await s3Client.send(putObjectCommand)
        logInfo("Uploaded HLS file to S3", { s3Key, fileSize: fileContent.length })
      }

      // Generate HLS manifest URL
      const hlsManifestUrl = getHLSVideoUrl(videoKey)

      logInfo("✅ Video transcoding completed successfully", {
        videoKey,
        hlsManifestUrl,
        filesCount: files.length,
        timestamp: new Date().toISOString(),
      })
      
      // Also log to console for immediate visibility
      console.log("🎬 HLS Transcoding Complete:", {
        videoKey,
        hlsUrl: hlsManifestUrl,
        filesUploaded: files.length,
      })

      // Cleanup temporary files
      try {
        const { rmSync } = await import('fs')
        rmSync(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        logError("Failed to cleanup temporary files", cleanupError as Error, { tempDir })
        // Don't fail the request if cleanup fails
      }

      return NextResponse.json({
        success: true,
        hlsUrl: hlsManifestUrl,
        videoKey,
      })
    } catch (error: any) {
      // Cleanup on error
      try {
        if (existsSync(tempDir)) {
          const { rmSync } = await import('fs')
          rmSync(tempDir, { recursive: true, force: true })
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      logError("Video transcoding error", error, {
        videoKey,
        userId: user.id,
      })

      return NextResponse.json(
        { error: error.message || "Failed to transcode video" },
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
