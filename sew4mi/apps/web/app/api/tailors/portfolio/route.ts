import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Portfolio GET - Checking authorization header...');

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.error('Portfolio GET - No auth token provided');
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    console.log('Portfolio GET - Creating Supabase client with token...');
    const supabase = await createClient();

    // Get authenticated user using the token
    console.log('Portfolio GET - Verifying user with token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    console.log('Portfolio GET - Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message
    });

    if (authError || !user) {
      console.error('Portfolio GET - Auth failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Verify user is a tailor
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Access denied. Tailor role required.' },
        { status: 403 }
      );
    }

    // Get tailor profile with portfolio data
    const { data: tailorProfile, error: profileError } = await supabase
      .from('tailor_profiles')
      .select('id, portfolio_images')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.warn('Error fetching tailor profile:', profileError.message);
      return NextResponse.json(
        { error: 'Tailor profile not found' },
        { status: 404 }
      );
    }

    // Parse portfolio_images JSONB array
    const portfolioImages = tailorProfile.portfolio_images || [];
    const portfolioItems = portfolioImages.map((item: any) => ({
      id: item.id || `portfolio-${Math.random()}`,
      imageUrl: item.url,
      title: item.title || 'Portfolio Item',
      description: item.description || 'Custom tailored garment',
      category: item.category || 'Custom Work',
      tags: item.tags || ['Custom', 'Tailored'],
      createdAt: item.uploadedAt || new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      items: portfolioItems,
    });
  } catch (error) {
    console.warn('Error fetching portfolio:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is a tailor
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Access denied. Tailor role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { imageUrls, titles, descriptions, categories, tags } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. imageUrls array required.' },
        { status: 400 }
      );
    }

    // Get current portfolio images
    const { data: currentProfile } = await supabase
      .from('tailor_profiles')
      .select('portfolio_images')
      .eq('user_id', user.id)
      .single();

    const currentImages = currentProfile?.portfolio_images || [];

    // Create new portfolio items
    const newItems = imageUrls.map((url: string, index: number) => ({
      id: `portfolio-${Date.now()}-${index}`,
      url,
      title: titles?.[index] || `Portfolio Item ${currentImages.length + index + 1}`,
      description: descriptions?.[index] || 'Custom tailored garment',
      category: categories?.[index] || 'Custom Work',
      tags: tags?.[index] || ['Custom', 'Tailored'],
      uploadedAt: new Date().toISOString(),
    }));

    // Combine with existing images
    const updatedImages = [...currentImages, ...newItems];

    // Check limit (max 20 portfolio items)
    if (updatedImages.length > 20) {
      return NextResponse.json(
        { error: 'Portfolio limit reached. Maximum 20 items allowed.' },
        { status: 400 }
      );
    }

    // Update portfolio images
    const { error: updateError } = await supabase
      .from('tailor_profiles')
      .update({ portfolio_images: updatedImages })
      .eq('user_id', user.id);

    if (updateError) {
      console.warn('Error updating portfolio:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update portfolio' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Portfolio updated successfully',
      itemsAdded: newItems.length,
    });
  } catch (error) {
    console.warn('Error updating portfolio:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is a tailor
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Access denied. Tailor role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId parameter required' },
        { status: 400 }
      );
    }

    // Get current portfolio images
    const { data: currentProfile } = await supabase
      .from('tailor_profiles')
      .select('portfolio_images')
      .eq('user_id', user.id)
      .single();

    const currentImages = currentProfile?.portfolio_images || [];

    // Find the item to delete
    const itemToDelete = currentImages.find((item: any) => item.id === itemId);

    if (!itemToDelete) {
      return NextResponse.json(
        { error: 'Portfolio item not found' },
        { status: 404 }
      );
    }

    // Filter out the item with matching id
    const updatedImages = currentImages.filter((item: any) => item.id !== itemId);

    // Update portfolio images in database
    const { error: updateError } = await supabase
      .from('tailor_profiles')
      .update({ portfolio_images: updatedImages })
      .eq('user_id', user.id);

    if (updateError) {
      console.warn('Error deleting portfolio item:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to delete portfolio item' },
        { status: 500 }
      );
    }

    // Delete files from storage (main image and thumbnail)
    const filesToDelete = [itemToDelete.storagePath];
    if (itemToDelete.thumbnailPath) {
      filesToDelete.push(itemToDelete.thumbnailPath);
    }

    if (itemToDelete.storagePath) {
      const { error: storageError } = await supabase.storage
        .from('portfolio-images')
        .remove(filesToDelete);

      if (storageError) {
        console.warn('Failed to delete files from storage:', storageError.message);
        // Don't fail the request - files might already be deleted or paths might be invalid
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Portfolio item deleted successfully',
    });
  } catch (error) {
    console.warn('Error deleting portfolio item:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to delete portfolio item' },
      { status: 500 }
    );
  }
}
