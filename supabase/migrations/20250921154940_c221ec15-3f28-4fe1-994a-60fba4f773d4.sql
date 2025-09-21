-- Security Fix: Make created_by column non-nullable to prevent security vulnerabilities
-- This ensures all leads must have a valid owner and prevents orphaned records

-- First, set any null values to a default (though none exist based on our check)
UPDATE leads SET created_by = auth.uid() WHERE created_by IS NULL;

-- Make the created_by column NOT NULL to prevent future security issues
ALTER TABLE leads ALTER COLUMN created_by SET NOT NULL;

-- Add a comment explaining the security importance
COMMENT ON COLUMN leads.created_by IS 'Required: User ID who created this lead. Critical for RLS security - must never be null.';