-- Migration: Add browser metadata to audits table
-- Date: 2024-12-11
-- Purpose: Store browser configuration and metadata from headless browser audits

-- Add browser_metadata column to store browser execution details
ALTER TABLE public.audits
ADD COLUMN IF NOT EXISTS browser_metadata jsonb DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.audits.browser_metadata IS 
'Browser execution metadata including: usedBrowser (boolean), userAgent (string), viewport (object), finalUrl (string), redirectChain (array), loadTime (number), resourceCounts (object). NULL for audits performed before browser feature was added.';

-- Create index for querying audits by browser usage
CREATE INDEX IF NOT EXISTS idx_audits_browser_used 
ON public.audits ((browser_metadata->>'usedBrowser'))
WHERE browser_metadata IS NOT NULL;

-- Create index for querying audits with redirects
CREATE INDEX IF NOT EXISTS idx_audits_with_redirects
ON public.audits ((jsonb_array_length(browser_metadata->'redirectChain')))
WHERE browser_metadata IS NOT NULL 
  AND browser_metadata->'redirectChain' IS NOT NULL;

-- Add GIN index for full browser_metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_audits_browser_metadata_gin
ON public.audits USING gin (browser_metadata)
WHERE browser_metadata IS NOT NULL;
