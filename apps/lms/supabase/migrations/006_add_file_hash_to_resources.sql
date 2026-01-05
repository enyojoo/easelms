-- Migration: Add file hash column to resources table for deduplication
-- This allows us to detect duplicate files and reuse existing S3 objects

ALTER TABLE resources
ADD COLUMN file_hash TEXT;

CREATE INDEX idx_resources_file_hash ON resources(file_hash);

COMMENT ON COLUMN resources.file_hash IS 'SHA-256 hash of file content for deduplication';
