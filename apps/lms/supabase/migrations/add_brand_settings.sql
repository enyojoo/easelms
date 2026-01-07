-- Add brand settings columns to platform_settings table
-- This migration adds columns for platform branding: logo, favicon, platform name, and SEO settings

-- Check if platform_settings table exists, if not create it
CREATE TABLE IF NOT EXISTS platform_settings (
  id SERIAL PRIMARY KEY,
  default_currency TEXT DEFAULT 'USD',
  course_enrollment_notifications BOOLEAN DEFAULT true,
  course_completion_notifications BOOLEAN DEFAULT true,
  platform_announcements BOOLEAN DEFAULT true,
  user_email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add brand settings columns if they don't exist
DO $$ 
BEGIN
  -- Platform branding
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'platform_name') THEN
    ALTER TABLE platform_settings ADD COLUMN platform_name TEXT DEFAULT 'EaseLMS';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'platform_description') THEN
    ALTER TABLE platform_settings ADD COLUMN platform_description TEXT DEFAULT 'EaseLMS is a modern, open-source Learning Management System built with modern tech stack. It provides a complete solution for creating, managing, and delivering online courses with features like video lessons, interactive quizzes, progress tracking, certificates, and payment integration.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'logo_black') THEN
    ALTER TABLE platform_settings ADD COLUMN logo_black TEXT DEFAULT 'https://cldup.com/VQGhFU5kd6.svg';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'logo_white') THEN
    ALTER TABLE platform_settings ADD COLUMN logo_white TEXT DEFAULT 'https://cldup.com/bwlFqC4f8I.svg';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'favicon') THEN
    ALTER TABLE platform_settings ADD COLUMN favicon TEXT DEFAULT 'https://cldup.com/6yEKvPtX22.svg';
  END IF;
  
  -- SEO settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'seo_title') THEN
    ALTER TABLE platform_settings ADD COLUMN seo_title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'seo_description') THEN
    ALTER TABLE platform_settings ADD COLUMN seo_description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'seo_keywords') THEN
    ALTER TABLE platform_settings ADD COLUMN seo_keywords TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'seo_image') THEN
    ALTER TABLE platform_settings ADD COLUMN seo_image TEXT;
  END IF;
END $$;

-- Create or update the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on platform_settings table
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Platform settings policies
CREATE POLICY "Anyone can view platform settings"
  ON platform_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can insert platform settings"
  ON platform_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update platform settings"
  ON platform_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can delete platform settings"
  ON platform_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );
