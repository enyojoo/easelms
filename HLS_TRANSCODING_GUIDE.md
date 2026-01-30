# HLS Transcoding Guide

## How to Check if Video Transcoding is Working

### 1. **Browser Console (Client-Side)**

When you upload a video, open your browser's Developer Console (F12 or Cmd+Option+I) and look for:

#### On Upload:
```
Triggering HLS transcoding for video: courses/course-18/preview-video-1234567890-video.mp4
```

#### After API Call:
```
HLS transcoding triggered successfully
```

#### If HLS is Available:
```
🎬 HLS Transcoding Complete: { videoKey: "...", hlsUrl: "...", filesUploaded: 15 }
```

#### If HLS Not Available Yet:
```
HLS not available (transcoding may still be in progress), falling back to MP4
```

### 2. **Vercel Server Logs (Server-Side)**

#### Option A: Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click on **"Deployments"** tab
4. Click on the latest deployment
5. Click on **"Functions"** tab
6. Look for `/api/videos/transcode` function logs

#### Option B: Vercel CLI
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# View logs
vercel logs --follow
```

#### What to Look For in Server Logs:

**When Transcoding Starts:**
```
[INFO] 🚀 Starting video transcoding
🎬 HLS Transcoding Started: { videoKey: "...", userId: "...", time: "..." }
```

**During Process:**
```
[INFO] Downloading video from S3
[INFO] Video downloaded, starting FFmpeg transcoding
[INFO] FFmpeg transcoding completed
[INFO] Uploading HLS files to S3
[INFO] Uploaded HLS file to S3: courses/course-18/hls/preview-video-123/master.m3u8
```

**When Complete:**
```
[INFO] ✅ Video transcoding completed successfully
🎬 HLS Transcoding Complete: { videoKey: "...", hlsUrl: "...", filesUploaded: 15 }
```

**If There's an Error:**
```
[ERROR] Video transcoding error
[ERROR] FFmpeg failed with code 1: ...
```

### 3. **Check S3 Bucket**

1. Go to AWS S3 Console
2. Navigate to your bucket
3. Look for the video file path
4. Check if there's a `/hls/` subdirectory with:
   - `master.m3u8` (main manifest)
   - `stream_0.m3u8`, `stream_1.m3u8`, `stream_2.m3u8` (quality playlists)
   - `segment_*.ts` files (video segments)

**Example Structure:**
```
courses/
  course-18/
    preview-video-1234567890-video.mp4  ← Original video
    hls/
      preview-video-1234567890-video/
        master.m3u8                      ← HLS manifest
        stream_0.m3u8                    ← 1080p playlist
        stream_1.m3u8                    ← 720p playlist
        stream_2.m3u8                    ← 480p playlist
        segment_001_0.ts                 ← Video segments
        segment_002_0.ts
        ...
```

### 4. **Browser Network Tab**

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Filter by **"m3u8"** or **"media"**
4. Play the video
5. Look for requests to `.m3u8` files

**If HLS is Working:**
- You'll see requests to `master.m3u8`
- Then requests to `stream_0.m3u8`, `stream_1.m3u8`, etc.
- Then requests to `.ts` segment files
- Status codes should be `200 OK`

**If HLS Not Available:**
- You'll see `403 Forbidden` or `404 Not Found` for `.m3u8` files
- Console will show: "HLS not available, falling back to MP4"

### 5. **Check Video Player Behavior**

#### HLS Working:
- Video starts playing smoothly
- Network tab shows `.m3u8` and `.ts` requests
- Quality may adjust automatically based on network speed
- Smooth playback even on slower connections

#### HLS Not Working (MP4 Fallback):
- Video still plays (as MP4)
- Console shows "falling back to MP4"
- Network tab shows only `.mp4` file requests
- May lag on slower connections (no adaptive bitrate)

## Troubleshooting

### Transcoding Not Starting?

1. **Check browser console** for "Triggering HLS transcoding" message
2. **Check network tab** for `/api/videos/transcode` request
3. **Verify** the request returns `200 OK`

### Transcoding Failing?

1. **Check Vercel logs** for error messages
2. **Common issues:**
   - FFmpeg not installed on server
   - Video file corrupted
   - Insufficient server memory/timeout
   - S3 permissions issue

### Transcoding Complete But HLS Not Playing?

1. **Check S3 bucket** - verify HLS files exist
2. **Check browser console** - look for HLS URL construction logs
3. **Check network tab** - verify `.m3u8` requests are being made
4. **Check CORS** - ensure Azure Front Door allows `.m3u8` requests

### How Long Does Transcoding Take?

- **Small videos (< 100MB):** 1-3 minutes
- **Medium videos (100-500MB):** 3-10 minutes
- **Large videos (> 500MB):** 10-30+ minutes

*Note: Transcoding happens asynchronously - video plays as MP4 immediately while transcoding runs in background.*

## Manual Transcoding Trigger

If you need to manually trigger transcoding for an existing video:

```bash
curl -X POST https://your-domain.com/api/videos/transcode \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"videoKey": "courses/course-18/preview-video-1234567890-video.mp4"}'
```

Or use the browser console:
```javascript
fetch('/api/videos/transcode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    videoKey: 'courses/course-18/preview-video-1234567890-video.mp4' 
  })
}).then(r => r.json()).then(console.log)
```
