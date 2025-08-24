import { NextRequest, NextResponse } from 'next/server';
import { AutocompleteQuerySchema } from '@sew4mi/shared';
import { TailorSearchService } from '@/lib/services/tailor-search.service';
import { z } from 'zod';

const searchService = new TailorSearchService();

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 200;

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
    const { searchParams } = new URL(_request.url);
    
    // Rate limiting
    const identifier = _request.headers.get('x-forwarded-for') || _request.headers.get('x-real-ip') || 'anonymous';
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate query parameters
    const query = searchParams.get('query');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const typesParam = searchParams.get('types');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const params: any = { query };
    if (limit) params.limit = limit;
    if (typesParam) {
      params.types = typesParam.split(',').map(t => t.trim());
    }

    // Validate parameters
    const validatedParams = AutocompleteQuerySchema.parse(params);

    // Get autocomplete suggestions
    const result = await searchService.getAutocomplete(
      validatedParams.query,
      validatedParams.limit
    );

    // Set cache headers for aggressive caching
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    
    return response;

  } catch (error) {
    console.error('Autocomplete API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}