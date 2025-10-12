-- Add portfolio_images JSONB column to support multiple portfolio images
-- This migration adds a new column and migrates existing portfolio_url data

-- Step 1: Add the new portfolio_images column
ALTER TABLE public.tailor_profiles
ADD COLUMN IF NOT EXISTS portfolio_images JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing portfolio_url data to portfolio_images
-- Only migrate if portfolio_url is not null and portfolio_images is empty
UPDATE public.tailor_profiles
SET portfolio_images = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'url', portfolio_url,
    'title', 'Portfolio Item',
    'description', 'Custom tailored garment',
    'category', 'Custom Work',
    'tags', ARRAY['Custom', 'Tailored'],
    'uploadedAt', NOW()::text
  )
)
WHERE portfolio_url IS NOT NULL
  AND portfolio_url != ''
  AND (portfolio_images IS NULL OR portfolio_images = '[]'::jsonb);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN public.tailor_profiles.portfolio_images IS
  'Array of portfolio image objects with metadata. Each object contains: id, url, title, description, category, tags, uploadedAt';

-- Step 4: Keep portfolio_url for backward compatibility
COMMENT ON COLUMN public.tailor_profiles.portfolio_url IS
  'Legacy single portfolio URL field. Deprecated in favor of portfolio_images. Kept for backward compatibility.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Portfolio images migration completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added: portfolio_images JSONB column';
  RAISE NOTICE 'Migrated: Existing portfolio_url data';
  RAISE NOTICE 'Status: Ready for multi-image portfolio uploads';
  RAISE NOTICE '========================================';
END $$;
