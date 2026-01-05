-- Migration: Create resources and lesson_resources tables
-- This migrates resources from JSONB storage to normalized tables

-- Resources table (reusable across courses)
CREATE TABLE resources (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('document', 'link')),
  url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  s3_key TEXT, -- For S3 files, store the key for cleanup
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  download_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0, -- How many lessons use this resource
  
  -- Indexes
  CONSTRAINT resources_url_unique UNIQUE(url, created_by) -- Prevent exact duplicates
);

CREATE INDEX idx_resources_created_by ON resources(created_by);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_title ON resources(title);

-- Junction table for lesson-resource relationship (many-to-many)
CREATE TABLE lesson_resources (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT lesson_resources_unique UNIQUE(lesson_id, resource_id)
);

CREATE INDEX idx_lesson_resources_lesson ON lesson_resources(lesson_id);
CREATE INDEX idx_lesson_resources_resource ON lesson_resources(resource_id);

-- Add comments for documentation
COMMENT ON TABLE resources IS 'Reusable resources that can be shared across multiple lessons and courses';
COMMENT ON TABLE lesson_resources IS 'Junction table linking lessons to resources with ordering';
COMMENT ON COLUMN resources.s3_key IS 'S3 object key for file cleanup on deletion';
COMMENT ON COLUMN resources.usage_count IS 'Number of lessons using this resource';
COMMENT ON COLUMN resources.download_count IS 'Number of times this resource has been downloaded';
