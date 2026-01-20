/**
 * Advanced Cache Manager
 * Multi-layer caching with IndexedDB, localStorage, and React Query integration
 * Features: TTL, versioning, compression, background cleanup
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number // Time-to-live in milliseconds
  version: string
  compressed?: boolean
  checksum?: string
}

interface CacheOptions {
  ttl?: number // Default 24 hours
  version?: string // For handling data structure changes
  compress?: boolean // Compress large data
  priority?: 'high' | 'medium' | 'low' // Cache eviction priority
}

class CacheManager {
  private readonly dbName = 'easelms-cache'
  private readonly dbVersion = 1
  private db: IDBDatabase | null = null
  private readonly defaultTTL = 24 * 60 * 60 * 1000 // 24 hours
  private readonly maxStorageSize = 50 * 1024 * 1024 // 50MB limit
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.initDB()
    this.startBackgroundCleanup()
  }

  private async initDB(): Promise<void> {
    if (typeof window === 'undefined') return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.warn('IndexedDB not available, falling back to localStorage')
        resolve()
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('ttl', 'ttl', { unique: false })
          store.createIndex('priority', 'priority', { unique: false })
        }
      }
    })
  }

  private startBackgroundCleanup(): void {
    // Run cleanup every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 30 * 60 * 1000)
  }

  private async cleanup(): Promise<void> {
    if (!this.db) return

    const now = Date.now()
    let totalSize = 0

    try {
      const transaction = this.db.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const request = store.openCursor()

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const entry: CacheEntry & { key: string } = cursor.value

          // Remove expired entries
          if (now > entry.timestamp + entry.ttl) {
            cursor.delete()
          } else {
            // Calculate approximate size
            totalSize += JSON.stringify(entry).length
          }

          cursor.continue()
        } else {
          // If we're over the size limit, remove low priority items
          if (totalSize > this.maxStorageSize) {
            this.evictLowPriority(totalSize - this.maxStorageSize)
          }
        }
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error)
    }
  }

  private async evictLowPriority(bytesToFree: number): Promise<void> {
    if (!this.db) return

    try {
      const transaction = this.db.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      const index = store.index('priority')

      let freedBytes = 0
      const request = index.openCursor('low')

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor && freedBytes < bytesToFree) {
          const entry: CacheEntry & { key: string } = cursor.value
          freedBytes += JSON.stringify(entry).length
          cursor.delete()
          cursor.continue()
        }
      }
    } catch (error) {
      console.warn('Cache eviction failed:', error)
    }
  }

  private generateChecksum(data: any): string {
    // Simple checksum for data integrity
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  private compress(data: any): string {
    // Simple compression using JSON + base64
    try {
      const jsonStr = JSON.stringify(data)
      if (typeof window !== 'undefined' && window.btoa) {
        return window.btoa(jsonStr)
      }
      return jsonStr
    } catch {
      return JSON.stringify(data)
    }
  }

  private decompress(compressedData: string): any {
    try {
      if (typeof window !== 'undefined' && window.atob) {
        const jsonStr = window.atob(compressedData)
        return JSON.parse(jsonStr)
      }
      return JSON.parse(compressedData)
    } catch {
      return JSON.parse(compressedData)
    }
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.defaultTTL,
      version: options.version || '1.0',
      compressed: options.compress && JSON.stringify(data).length > 1000,
      checksum: this.generateChecksum(data)
    }

    // Compress if needed
    if (entry.compressed) {
      entry.data = this.compress(data) as T
    }

    // Try IndexedDB first, fall back to localStorage
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        await new Promise<void>((resolve, reject) => {
          const request = store.put({ key, ...entry, priority: options.priority || 'medium' })
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
        return
      } catch (error) {
        console.warn('IndexedDB write failed, falling back to localStorage:', error)
      }
    }

    // Fallback to localStorage for critical data
    try {
      const storageKey = `easelms_cache_${key}`
      localStorage.setItem(storageKey, JSON.stringify(entry))
    } catch (error) {
      console.warn('localStorage write failed:', error)
    }
  }

  async get<T>(key: string, expectedVersion?: string): Promise<T | null> {
    let entry: CacheEntry<T> | null = null

    // Try IndexedDB first
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readonly')
        const store = transaction.objectStore('cache')
        entry = await new Promise<CacheEntry<T> | null>((resolve, reject) => {
          const request = store.get(key)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.warn('IndexedDB read failed, falling back to localStorage:', error)
      }
    }

    // Fallback to localStorage
    if (!entry) {
      try {
        const storageKey = `easelms_cache_${key}`
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          entry = JSON.parse(stored)
        }
      } catch (error) {
        console.warn('localStorage read failed:', error)
      }
    }

    if (!entry) return null

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      await this.delete(key)
      return null
    }

    // Check version compatibility
    if (expectedVersion && entry.version !== expectedVersion) {
      await this.delete(key)
      return null
    }

    // Verify checksum
    let dataToVerify = entry.data
    if (entry.compressed) {
      dataToVerify = this.decompress(entry.data as string)
    }

    if (this.generateChecksum(dataToVerify) !== entry.checksum) {
      await this.delete(key)
      return null
    }

    // Decompress if needed
    return entry.compressed ? this.decompress(entry.data as string) : entry.data
  }

  async delete(key: string): Promise<void> {
    // Try IndexedDB first
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(key)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
        return
      } catch (error) {
        console.warn('IndexedDB delete failed:', error)
      }
    }

    // Fallback to localStorage
    try {
      const storageKey = `easelms_cache_${key}`
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('localStorage delete failed:', error)
    }
  }

  async clear(): Promise<void> {
    // Clear IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        await new Promise<void>((resolve, reject) => {
          const request = store.clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.warn('IndexedDB clear failed:', error)
      }
    }

    // Clear localStorage cache entries
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('easelms_cache_'))
      keys.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('localStorage clear failed:', error)
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    indexedDBCount: number
    localStorageCount: number
    totalSize: number
  }> {
    let indexedDBCount = 0
    let localStorageCount = 0
    let totalSize = 0

    // Count IndexedDB entries
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readonly')
        const store = transaction.objectStore('cache')
        const request = store.count()
        indexedDBCount = await new Promise<number>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
      } catch (error) {
        console.warn('IndexedDB stats failed:', error)
      }
    }

    // Count localStorage entries and calculate size
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('easelms_cache_'))
      localStorageCount = keys.length
      keys.forEach(key => {
        const item = localStorage.getItem(key)
        if (item) totalSize += item.length
      })
    } catch (error) {
      console.warn('localStorage stats failed:', error)
    }

    return { indexedDBCount, localStorageCount, totalSize }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Singleton instance
let cacheManagerInstance: CacheManager | null = null

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager()
  }
  return cacheManagerInstance
}

// React Query integration helpers
export function createCacheOptions(options?: CacheOptions) {
  return {
    ...options,
    // React Query will handle the caching, we just provide additional metadata
  }
}

// Cache key helpers
export const CACHE_KEYS = {
  PURCHASES: 'purchases',
  ENROLLMENTS: 'enrollments',
  COURSES: 'courses',
  COURSE: (id: string | number) => `course_${id}`,
  PROFILE: 'profile',
  CERTIFICATES: 'certificates',
  PROGRESS: 'progress'
} as const

export type { CacheOptions, CacheEntry }