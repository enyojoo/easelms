"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import FileUpload from "@/components/FileUpload"
import { Palette, Globe, Search, Save, Edit, X } from "lucide-react"
import { toast } from "sonner"
import { useSettings, useUpdateSettings } from "@/lib/react-query/hooks"
import { useTheme } from "@/components/ThemeProvider"

export default function BrandSettings() {
  const { data: settingsData, isPending: settingsPending } = useSettings()
  const updateSettingsMutation = useUpdateSettings()
  const { theme } = useTheme()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [brandSettings, setBrandSettings] = useState({
    platformName: "EaseLMS",
    platformDescription: "EaseLMS is a modern, open-source Learning Management System built with modern tech stack. It provides a complete solution for creating, managing, and delivering online courses with features like video lessons, interactive quizzes, progress tracking, certificates, and payment integration.",
    logoBlack: "https://cldup.com/VQGhFU5kd6.svg",
    logoWhite: "https://cldup.com/bwlFqC4f8I.svg",
    favicon: "https://cldup.com/6yEKvPtX22.svg",
    contactEmail: "",
    appUrl: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    seoImage: "",
  })
  
  const initialSettingsRef = useRef<typeof brandSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load brand settings from API
  useEffect(() => {
    if (settingsData?.platformSettings) {
      const platformSettings = settingsData.platformSettings
      const loadedSettings = {
        platformName: platformSettings.platform_name || "EaseLMS",
        platformDescription: platformSettings.platform_description || "EaseLMS is a modern, open-source Learning Management System built with modern tech stack. It provides a complete solution for creating, managing, and delivering online courses with features like video lessons, interactive quizzes, progress tracking, certificates, and payment integration.",
        logoBlack: platformSettings.logo_black || "https://cldup.com/VQGhFU5kd6.svg",
        logoWhite: platformSettings.logo_white || "https://cldup.com/bwlFqC4f8I.svg",
        favicon: platformSettings.favicon || "https://cldup.com/6yEKvPtX22.svg",
        contactEmail: platformSettings.contact_email || "",
        appUrl: platformSettings.app_url || "",
        seoTitle: platformSettings.seo_title || "",
        seoDescription: platformSettings.seo_description || "",
        seoKeywords: platformSettings.seo_keywords || "",
        seoImage: platformSettings.seo_image || "",
      }
      setBrandSettings(loadedSettings)
      if (!initialSettingsRef.current) {
        initialSettingsRef.current = loadedSettings
      }
    }
  }, [settingsData])

  const handleEdit = () => {
    setIsEditing(true)
    if (initialSettingsRef.current) {
      // Reset to initial values when starting to edit
      setBrandSettings({ ...initialSettingsRef.current })
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
    if (initialSettingsRef.current) {
      // Restore initial values
      setBrandSettings({ ...initialSettingsRef.current })
    }
  }

  const handleSave = async () => {
    if (!initialSettingsRef.current) return

    setIsSaving(true)
    setError(null)

    try {
      const platformSettings = {
        platform_name: brandSettings.platformName,
        platform_description: brandSettings.platformDescription,
        logo_black: brandSettings.logoBlack,
        logo_white: brandSettings.logoWhite,
        favicon: brandSettings.favicon,
        contact_email: brandSettings.contactEmail || null,
        app_url: brandSettings.appUrl || null,
        seo_title: brandSettings.seoTitle || null,
        seo_description: brandSettings.seoDescription || null,
        seo_keywords: brandSettings.seoKeywords || null,
        seo_image: brandSettings.seoImage || null,
      }

      await updateSettingsMutation.mutateAsync({ platformSettings })
      
      // Update local state and ref
      initialSettingsRef.current = { ...brandSettings }
      
      // Update the settings data in the component to reflect changes immediately
      // The mutation already updates the cache, but we need to ensure UI reflects it
      if (settingsData) {
        settingsData.platformSettings = {
          ...settingsData.platformSettings,
          ...platformSettings,
        }
      }
      
      setIsEditing(false)
      toast.success("Brand settings saved successfully")
    } catch (err: any) {
      console.error("Error saving brand settings:", err)
      setError(err.message || "Failed to save brand settings")
      toast.error(err.message || "Failed to save brand settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = (field: "logoBlack" | "logoWhite" | "favicon" | "seoImage") => (files: File[], urls: string[]) => {
    if (urls.length > 0) {
      setBrandSettings((prev) => ({ ...prev, [field]: urls[0] }))
    }
  }

  // Determine theme for logo preview backgrounds
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  if (settingsPending) {
    return <div className="text-muted-foreground">Loading brand settings...</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Platform Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
          <CardTitle className="flex items-center">
            <Palette className="mr-2 h-5 w-5" /> Platform Branding
          </CardTitle>
              <CardDescription>
                Customize your platform's visual identity. These settings will replace the default EaseLMS branding.
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button onClick={handleEdit} variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleCancel} variant="outline" size="sm" disabled={isSaving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} size="sm" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Name */}
          <div className="space-y-2">
            <Label htmlFor="platform-name" className="text-base font-semibold">
              Platform Name
            </Label>
            <Input
              id="platform-name"
              value={brandSettings.platformName}
              onChange={(e) => setBrandSettings((prev) => ({ ...prev, platformName: e.target.value }))}
              placeholder="EaseLMS"
              className="max-w-md"
              disabled={!isEditing}
            />
            <p className="text-sm text-muted-foreground">
              The name of your platform. This will appear in the browser tab and throughout the application.
            </p>
          </div>

          {/* Platform Description */}
          <div className="space-y-2">
            <Label htmlFor="platform-description" className="text-base font-semibold">Platform Description</Label>
            <Textarea
              id="platform-description"
              value={brandSettings.platformDescription}
              onChange={(e) => setBrandSettings((prev) => ({ ...prev, platformDescription: e.target.value }))}
              placeholder="Enter platform description..."
              rows={4}
              className="max-w-2xl"
              disabled={!isEditing}
            />
            <p className="text-sm text-muted-foreground">
              A brief description of your platform. This will be used for SEO and meta tags.
            </p>
          </div>

          {/* Logo Black */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Logo (Dark Mode / Black)</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1 max-w-md">
                <FileUpload
                  type="image"
                  accept="image/*"
                  onUploadComplete={handleFileUpload("logoBlack")}
                  initialValue={brandSettings.logoBlack}
                  bucket="course-thumbnails"
                  additionalPath="brand"
                  disabled={!isEditing}
                />
              </div>
              {brandSettings.logoBlack && (
                <div className="flex-shrink-0">
                  <div className="h-16 w-auto border rounded p-2 bg-white dark:bg-white">
                    <img
                      src={brandSettings.logoBlack}
                      alt="Logo preview"
                      className="h-full w-auto object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Logo displayed in dark mode or on light backgrounds. Recommended: SVG or PNG with transparent background.
            </p>
          </div>

          {/* Logo White */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Logo (Light Mode / White)</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1 max-w-md">
                <FileUpload
                  type="image"
                  accept="image/*"
                  onUploadComplete={handleFileUpload("logoWhite")}
                  initialValue={brandSettings.logoWhite}
                  bucket="course-thumbnails"
                  additionalPath="brand"
                  disabled={!isEditing}
                />
              </div>
              {brandSettings.logoWhite && (
                <div className="flex-shrink-0">
                  <div className="h-16 w-auto border rounded p-2 bg-black dark:bg-black">
                    <img
                      src={brandSettings.logoWhite}
                      alt="Logo preview"
                      className="h-full w-auto object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Logo displayed in light mode or on dark backgrounds. Recommended: SVG or PNG with transparent background.
            </p>
          </div>

          {/* Favicon */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Favicon</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1 max-w-md">
                <FileUpload
                  type="image"
                  accept="image/*"
                  onUploadComplete={handleFileUpload("favicon")}
                  initialValue={brandSettings.favicon}
                  bucket="course-thumbnails"
                  additionalPath="brand"
                  disabled={!isEditing}
                />
              </div>
              {brandSettings.favicon && (
                <div className="flex-shrink-0">
                  <img
                    src={brandSettings.favicon}
                    alt="Favicon preview"
                    className="h-8 w-8 object-contain border rounded p-1 bg-background"
                  />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              The small icon displayed in browser tabs. Recommended: 512x512px PNG/SVG.
            </p>
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contact-email" className="text-base font-semibold">
              Contact Email
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={brandSettings.contactEmail}
              onChange={(e) => setBrandSettings((prev) => ({ ...prev, contactEmail: e.target.value }))}
              placeholder="support@yourdomain.com"
              className="max-w-md"
              disabled={!isEditing}
            />
            <p className="text-sm text-muted-foreground">
              Contact email address used in email templates and support communications.
            </p>
          </div>

          {/* App URL */}
          <div className="space-y-2">
            <Label htmlFor="app-url" className="text-base font-semibold">
              App URL
            </Label>
            <Input
              id="app-url"
              type="url"
              value={brandSettings.appUrl}
              onChange={(e) => setBrandSettings((prev) => ({ ...prev, appUrl: e.target.value }))}
              placeholder="https://yourdomain.com"
              className="max-w-md"
              disabled={!isEditing}
            />
            <p className="text-sm text-muted-foreground">
              The base URL of your application. Used in email templates for links and references.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" /> SEO Settings
          </CardTitle>
          <CardDescription>
            Configure search engine optimization settings. These will be used for meta tags and social media sharing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SEO Title */}
          <div className="space-y-2">
            <Label htmlFor="seo-title" className="text-base font-semibold">SEO Title</Label>
            <Input
              id="seo-title"
              value={brandSettings.seoTitle}
              onChange={(e) => setBrandSettings((prev) => ({ ...prev, seoTitle: e.target.value }))}
              placeholder="Enter SEO title (optional)"
              className="max-w-md"
              disabled={!isEditing}
            />
            <p className="text-sm text-muted-foreground">
              Custom title for search engines. If not set, platform name will be used.
            </p>
          </div>

          {/* SEO Description */}
          <div className="space-y-2">
            <Label htmlFor="seo-description" className="text-base font-semibold">SEO Description</Label>
            <Textarea
              id="seo-description"
              value={brandSettings.seoDescription}
              onChange={(e) => setBrandSettings((prev) => ({ ...prev, seoDescription: e.target.value }))}
              placeholder="Enter SEO description (optional)"
              rows={3}
              className="max-w-2xl"
              disabled={!isEditing}
            />
            <p className="text-sm text-muted-foreground">
              Custom description for search engines. If not set, platform description will be used.
            </p>
          </div>

          {/* SEO Keywords */}
          <div className="space-y-2">
            <Label htmlFor="seo-keywords" className="text-base font-semibold">SEO Keywords</Label>
            <Input
              id="seo-keywords"
              value={brandSettings.seoKeywords}
              onChange={(e) => setBrandSettings((prev) => ({ ...prev, seoKeywords: e.target.value }))}
              placeholder="keyword1, keyword2, keyword3 (optional)"
              className="max-w-md"
              disabled={!isEditing}
            />
            <p className="text-sm text-muted-foreground">
              Comma-separated keywords for SEO. These help search engines understand your platform's content.
            </p>
          </div>

          {/* SEO Image */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">SEO Image (Open Graph)</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1 max-w-md">
                <FileUpload
                  type="image"
                  accept="image/*"
                  onUploadComplete={handleFileUpload("seoImage")}
                  initialValue={brandSettings.seoImage}
                  bucket="course-thumbnails"
                  additionalPath="brand"
                  disabled={!isEditing}
                />
              </div>
              {brandSettings.seoImage && (
                <div className="flex-shrink-0">
                  <img
                    src={brandSettings.seoImage}
                    alt="SEO image preview"
                    className="h-32 w-auto object-contain border rounded p-2 bg-background"
                  />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Image displayed when sharing your platform on social media. Recommended: 1200x630px PNG/JPG.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
