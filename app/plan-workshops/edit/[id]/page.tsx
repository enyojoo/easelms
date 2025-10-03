"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter, useParams } from "next/navigation"
// ... other imports

function EditWorkshopContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  // Rest of component logic...

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Workshop</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Workshop editing functionality will be implemented here.</p>
        </div>
      </div>
    </div>
  )
}

export default function EditWorkshopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <EditWorkshopContent />
    </Suspense>
  )
}
