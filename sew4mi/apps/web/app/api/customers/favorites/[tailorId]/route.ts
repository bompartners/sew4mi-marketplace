import { NextRequest, NextResponse } from 'next/server';
import { FavoritesService } from '@/lib/services/favorites.service';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const favoritesService = new FavoritesService();

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 50;

  const current = rateLimitMap.get(identifier);
  if (!current || current.resetTime < now) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

interface RouteParams {
  tailorId: string;
}

/**
 * GET - Check if tailor is favorited
 */
export async function GET(
  __request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { tailorId } = await params;
    
    // Get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate tailorId
    if (!tailorId || tailorId.length !== 36) { // UUID length check
      return NextResponse.json(
        { error: 'Invalid tailor ID' },
        { status: 400 }
      );
    }

    // Check if favorited
    const isFavorited = await favoritesService.isFavorite(user.id, tailorId);

    return NextResponse.json({ isFavorited });

  } catch (error) {
    console.error('Check favorite API error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove tailor from favorites
 */
export async function DELETE(
  __request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { tailorId } = await params;
    
    // Get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Only customers can manage favorites' },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Validate tailorId
    if (!tailorId || tailorId.length !== 36) { // UUID length check
      return NextResponse.json(
        { error: 'Invalid tailor ID' },
        { status: 400 }
      );
    }

    // Remove favorite
    await favoritesService.removeFavorite(user.id, tailorId);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Remove favorite API error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Toggle favorite status
 */
export async function PUT(
  __request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { tailorId } = await params;
    
    // Get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Only customers can manage favorites' },
        { status: 403 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Validate tailorId
    if (!tailorId || tailorId.length !== 36) { // UUID length check
      return NextResponse.json(
        { error: 'Invalid tailor ID' },
        { status: 400 }
      );
    }

    // Toggle favorite
    const result = await favoritesService.toggleFavorite(user.id, tailorId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Toggle favorite API error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}