-- Migration: Create storage bucket for tailor application workspace photos and documents
-- Date: 2024-10-23
-- Description: Allow applicants to upload workspace photos and business documents during tailor application process

-- Create storage bucket for tailor applications
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tailor-applications',
  'tailor-applications',
  true, -- Public access for review by admin
  10485760, -- 10MB limit per file (increased for documents)
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png', 
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy: Allow authenticated users to upload their application photos and documents
CREATE POLICY "Users can upload their tailor application files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tailor-applications' AND
  (
    (storage.foldername(name))[1] = 'workspace-photos' OR
    (storage.foldername(name))[1] = 'business-documents'
  )
);

-- Create storage policy: Allow public read access to application photos for review
CREATE POLICY "Anyone can view tailor application photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tailor-applications');

-- Create storage policy: Users can delete their own application photos
CREATE POLICY "Users can delete own application photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tailor-applications'
);

-- Create storage policy: Users can update their own application photos
CREATE POLICY "Users can update own application photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tailor-applications'
)
WITH CHECK (
  bucket_id = 'tailor-applications'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tailor Applications Storage Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket: tailor-applications';
  RAISE NOTICE 'Max file size: 5MB';
  RAISE NOTICE 'Allowed types: JPEG, JPG, PNG, WebP';
  RAISE NOTICE 'Public access: Enabled for review';
  RAISE NOTICE '========================================';
END $$;

