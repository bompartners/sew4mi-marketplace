import { NextRequest, NextResponse } from 'next/server';
import { AddFavoriteSchema } from '@sew4mi/shared';
import { FavoritesService } from '@/lib/services/favorites.service';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';

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

/**
 * GET - Get user's favorites
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    let result;
    
    if (search) {
      // Search within favorites
      result = await favoritesService.searchFavorites(user.id, search, page, limit);
      result = {
        ...result,
        page,
        totalPages: Math.ceil(result.total / limit),
      };
    } else {
      // Get all favorites
      result = await favoritesService.getFavorites(user.id, page, limit);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Get favorites API error:', error);
    
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
 * POST - Add tailor to favorites
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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
        { error: 'Only customers can add favorites' },
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

    // Parse and validate request body
    const body = await request.json();
    const { tailorId } = AddFavoriteSchema.parse(body);

    // Add favorite
    const favorite = await favoritesService.addFavorite(user.id, tailorId);

    return NextResponse.json(favorite, { status: 201 });

  } catch (error) {
    console.error('Add favorite API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

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
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}