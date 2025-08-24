import { NextRequest, NextResponse } from 'next/server';
import { FeaturedTailorFiltersSchema } from '@sew4mi/shared';
import { TailorSearchService } from '@/lib/services/tailor-search.service';
import { z } from 'zod';

const searchService = new TailorSearchService();

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);

    // Parse and validate query parameters
    const rawFilters = Object.fromEntries(searchParams.entries());
    
    // Create properly typed filters object
    const processedFilters: any = { ...rawFilters };
    
    // Handle array parameters
    if (processedFilters.specializations && typeof processedFilters.specializations === 'string') {
      processedFilters.specializations = processedFilters.specializations.split(',').map((s: string) => s.trim());
    }
    
    // Convert numeric parameters
    if (processedFilters.limit && typeof processedFilters.limit === 'string') {
      processedFilters.limit = parseInt(processedFilters.limit, 10);
    }

    // Validate filters
    const filters = FeaturedTailorFiltersSchema.parse(processedFilters);

    // Get featured tailors
    const featuredTailors = await searchService.getFeaturedTailors(filters);

    // Set aggressive cache headers since featured tailors don't change often
    const response = NextResponse.json({
      featuredTailors,
      count: featuredTailors.length,
      filters,
    });
    
    response.headers.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600'); // 30 min cache
    
    return response;

  } catch (error) {
    console.error('Featured tailors API error:', error);

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