import { NextRequest, NextResponse } from 'next/server';
import { TailorSearchFiltersSchema } from '@sew4mi/shared';
import { TailorSearchService } from '@/lib/services/tailor-search.service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const searchService = new TailorSearchService();

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

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

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(_request.url);
    
    // Get user info
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // Rate limiting
    const identifier = userId || (_request as any).ip || 'anonymous';
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate query parameters
    const rawFilters = Object.fromEntries(searchParams.entries());
    
    // Create properly typed filters object
    const processedFilters: any = { ...rawFilters };
    
    // Handle array parameters
    if (processedFilters.specializations && typeof processedFilters.specializations === 'string') {
      processedFilters.specializations = processedFilters.specializations.split(',').map((s: string) => s.trim());
    }
    
    // Convert numeric parameters
    ['minRating', 'maxPrice', 'minPrice', 'limit'].forEach(key => {
      if (processedFilters[key] && typeof processedFilters[key] === 'string') {
        processedFilters[key] = parseFloat(processedFilters[key] as string);
      }
    });

    // Handle location parameter
    if (processedFilters.lat && processedFilters.lng && typeof processedFilters.lat === 'string' && typeof processedFilters.lng === 'string') {
      processedFilters.location = {
        lat: parseFloat(processedFilters.lat),
        lng: parseFloat(processedFilters.lng),
        radius: processedFilters.radius && typeof processedFilters.radius === 'string' ? parseFloat(processedFilters.radius) : undefined,
      };
      delete processedFilters.lat;
      delete processedFilters.lng;
      delete processedFilters.radius;
    }

    // Handle boolean parameters
    ['verified', 'acceptsRushOrders'].forEach(key => {
      if (processedFilters[key] !== undefined) {
        processedFilters[key] = processedFilters[key] === 'true';
      }
    });

    // Validate filters
    const filters = TailorSearchFiltersSchema.parse(processedFilters);

    // Generate session ID for analytics
    const sessionId = _request.headers.get('x-session-id') || 
                      `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Perform search
    const result = await searchService.searchTailors(filters, userId, sessionId);

    // Set cache headers
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    response.headers.set('X-Session-ID', sessionId);
    
    return response;

  } catch (error) {
    console.error('Search API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid search parameters',
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
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id',
    },
  });
}