-- Create storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-images',
  'portfolio-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy: Allow authenticated users to upload their own portfolio images
CREATE POLICY "Tailors can upload portfolio images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-images' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'TAILOR'
  )
);

-- Create storage policy: Allow authenticated users to read all portfolio images (public)
CREATE POLICY "Anyone can view portfolio images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'portfolio-images');

-- Create storage policy: Tailors can delete their own portfolio images
CREATE POLICY "Tailors can delete own portfolio images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'portfolio-images' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'TAILOR'
  )
);

-- Create storage policy: Tailors can update their own portfolio images
CREATE POLICY "Tailors can update own portfolio images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'portfolio-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'portfolio-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Portfolio storage setup completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Bucket: portfolio-images';
  RAISE NOTICE 'Max file size: 5MB';
  RAISE NOTICE 'Allowed types: JPEG, PNG, WebP';
  RAISE NOTICE 'Policies: Upload, View, Delete, Update';
  RAISE NOTICE '========================================';
END $$;
