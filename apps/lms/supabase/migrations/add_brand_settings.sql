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
  -- Platform branding (defaults are hardcoded in application code, not in database)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'platform_name') THEN
    ALTER TABLE platform_settings ADD COLUMN platform_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'platform_description') THEN
    ALTER TABLE platform_settings ADD COLUMN platform_description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'logo_black') THEN
    ALTER TABLE platform_settings ADD COLUMN logo_black TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'logo_white') THEN
    ALTER TABLE platform_settings ADD COLUMN logo_white TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_settings' AND column_name = 'favicon') THEN
    ALTER TABLE platform_settings ADD COLUMN favicon TEXT;
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

-- Insert default platform settings row (only non-brand settings, brand settings use app defaults)
INSERT INTO platform_settings (
  default_currency,
  course_enrollment_notifications,
  course_completion_notifications,
  platform_announcements,
  user_email_notifications
)
SELECT 
  'USD',
  true,
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM platform_settings);

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
