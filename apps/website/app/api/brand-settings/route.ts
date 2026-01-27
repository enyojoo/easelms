import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Proxy brand settings request from website to LMS
    // This avoids CORS issues by making the request server-side
    const lmsUrl = (process.env.NEXT_PUBLIC_LMS_URL || "http://localhost:3001").replace(/\/$/, '') // Remove trailing slash
    const apiUrl = `${lmsUrl}/api/brand-settings`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Cache for 5 minutes on the server
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      // If LMS API is not available, return null
      return NextResponse.json({ platformSettings: null }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
      },
    })
  } catch (error: any) {
    console.error("Website brand-settings API error:", error)
    return NextResponse.json(
      { platformSettings: null, error: error?.message || "An unexpected error occurred while fetching brand settings" },
      { status: 500 }
    )
  }
}
