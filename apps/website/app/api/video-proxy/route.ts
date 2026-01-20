import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const videoUrl = searchParams.get('url')

  if (!videoUrl) {
    return NextResponse.json({ error: 'Video URL is required' }, { status: 400 })
  }

  try {
    // Validate the URL to ensure it's from our expected domain
    const allowedDomains = [
      'euniversity.s3.us-east-1.amazonaws.com',
      's3.us-east-1.amazonaws.com',
      'enthronementuniversity.org'
    ]

    const url = new URL(videoUrl)
    const isAllowed = allowedDomains.some(domain => url.hostname.includes(domain))

    if (!isAllowed) {
      return NextResponse.json({ error: 'Invalid video URL domain' }, { status: 403 })
    }

    // Fetch the video from the source
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VideoProxy/1.0)',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: response.status })
    }

    // Get the video content
    const videoBuffer = await response.arrayBuffer()

    // Create response with proper headers
    const videoResponse = new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'video/mp4',
        'Content-Length': videoBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

    return videoResponse

  } catch (error) {
    console.error('Video proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}