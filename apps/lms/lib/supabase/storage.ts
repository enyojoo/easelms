/**
 * Supabase Storage utility functions for file uploads, downloads, and management
 */

import { createClient } from "./server"
import { createClient as createBrowserClient } from "./client"

export type StorageBucket = "course-thumbnails" | "course-documents" | "user-avatars" | "certificates"

export interface UploadResult {
  path: string
  url: string
  error?: string
}

/**
 * Upload a file to Supabase Storage (server-side)
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File | Buffer,
  options?: {
    contentType?: string
    upsert?: boolean
  }
): Promise<UploadResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Unauthorized: User must be authenticated")
    }

    const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file

    const { data, error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
      contentType: options?.contentType || (file instanceof File ? file.type : "application/octet-stream"),
      upsert: options?.upsert || false,
    })

    if (error) {
      throw error
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)

    return {
      path: data.path,
      url: publicUrl,
    }
  } catch (error: any) {
    return {
      path: "",
      url: "",
      error: error.message || "Failed to upload file",
    }
  }
}

/**
 * Get public URL for a file in Supabase Storage
 */
export async function getPublicUrl(bucket: StorageBucket, path: string): Promise<string> {
  const supabase = await createClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete a file from Supabase Storage (server-side)
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Unauthorized: User must be authenticated")
    }

    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete file",
    }
  }
}

/**
 * List files in a bucket/folder (server-side)
 */
export async function listFiles(
  bucket: StorageBucket,
  folder?: string,
  options?: {
    limit?: number
    offset?: number
    sortBy?: { column: "name" | "created_at" | "updated_at"; order?: "asc" | "desc" }
  }
): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Unauthorized: User must be authenticated")
    }

    let query = supabase.storage.from(bucket).list(folder || "", {
      limit: options?.limit || 100,
      offset: options?.offset || 0,
      sortBy: options?.sortBy || { column: "created_at", order: "desc" },
    })

    const { data, error } = await query

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Failed to list files",
    }
  }
}

/**
 * Upload file from client-side (browser)
 */
export async function uploadFileClient(
  bucket: StorageBucket,
  path: string,
  file: File,
  options?: {
    contentType?: string
    upsert?: boolean
    onProgress?: (progress: number) => void
  }
): Promise<UploadResult> {
  try {
    const supabase = createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error("Unauthorized: User must be authenticated")
    }

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: options?.contentType || file.type,
      upsert: options?.upsert || false,
      cacheControl: "3600",
    })

    if (error) {
      throw error
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)

    return {
      path: data.path,
      url: publicUrl,
    }
  } catch (error: any) {
    return {
      path: "",
      url: "",
      error: error.message || "Failed to upload file",
    }
  }
}

/**
 * Get public URL for a file (client-side)
 */
export function getPublicUrlClient(bucket: StorageBucket, path: string): string {
  const supabase = createBrowserClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

