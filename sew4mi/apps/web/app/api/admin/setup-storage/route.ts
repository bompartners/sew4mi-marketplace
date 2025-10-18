import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Admin endpoint to setup storage buckets and policies
 * This should only be used in development/setup
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Check if user is admin (in production, add proper admin check)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Execute the SQL to create bucket and policies
    const setupSQL = `
      -- Create storage bucket for portfolio images
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'portfolio-images',
        'portfolio-images',
        true,
        5242880,
        ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      )
      ON CONFLICT (id) DO NOTHING;

      -- Drop existing policies
      DROP POLICY IF EXISTS "Tailors can upload portfolio images" ON storage.objects;
      DROP POLICY IF EXISTS "Anyone can view portfolio images" ON storage.objects;
      DROP POLICY IF EXISTS "Tailors can delete own portfolio images" ON storage.objects;
      DROP POLICY IF EXISTS "Tailors can update own portfolio images" ON storage.objects;

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
    `;

    // Note: Supabase client doesn't support direct SQL execution for storage
    // This would need to be done via Supabase Dashboard or CLI

    return NextResponse.json({
      error: 'This endpoint cannot execute storage SQL directly. Please run the SQL in Supabase Dashboard SQL Editor.',
      instructions: [
        '1. Open Supabase Dashboard at http://localhost:54323',
        '2. Navigate to SQL Editor',
        '3. Run the setup-portfolio-bucket.sql script',
        '4. Verify bucket exists by checking Storage section'
      ],
      sql: setupSQL
    }, { status: 500 });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup storage' },
      { status: 500 }
    );
  }
}

/**
 * Check if storage bucket exists
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Try to list files in the bucket (will fail if bucket doesn't exist)
    const { data, error } = await supabase.storage
      .from('portfolio-images')
      .list('', { limit: 1 });

    if (error) {
      return NextResponse.json({
        exists: false,
        error: error.message,
        message: 'Portfolio images bucket does not exist. Run setup SQL script.'
      });
    }

    return NextResponse.json({
      exists: true,
      message: 'Portfolio images bucket exists and is accessible',
      data: data
    });

  } catch (error) {
    return NextResponse.json({
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
