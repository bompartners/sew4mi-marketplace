-- Migration: Create storage bucket for order message attachments
-- Story 3.4: Real-time order messaging - file attachments
-- Date: 2025-10-18

-- Create storage bucket for order messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-messages',
  'order-messages',
  true, -- Public access for easier retrieval
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'audio/webm',
    'audio/mpeg',
    'audio/wav'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for authenticated users to upload files
CREATE POLICY "Users can upload message attachments for their orders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-messages' AND
  (
    -- Check if user is customer of the order
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = (storage.foldername(name))[1]::uuid
        AND customer_id = auth.uid()
    )
    OR
    -- Check if user is tailor of the order
    EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.id = (storage.foldername(name))[1]::uuid
        AND tp.user_id = auth.uid()
    )
  )
);

-- Create storage policy for authenticated users to view files
CREATE POLICY "Users can view message attachments for their orders"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-messages' AND
  (
    -- Check if user is customer of the order
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = (storage.foldername(name))[1]::uuid
        AND customer_id = auth.uid()
    )
    OR
    -- Check if user is tailor of the order
    EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.id = (storage.foldername(name))[1]::uuid
        AND tp.user_id = auth.uid()
    )
  )
);

-- Create storage policy for users to delete their own uploads
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-messages' AND
  (
    -- Check if user is customer of the order
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = (storage.foldername(name))[1]::uuid
        AND customer_id = auth.uid()
    )
    OR
    -- Check if user is tailor of the order
    EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.id = (storage.foldername(name))[1]::uuid
        AND tp.user_id = auth.uid()
    )
  )
);

-- Note: Storage bucket for order message attachments including images, documents, and voice messages

