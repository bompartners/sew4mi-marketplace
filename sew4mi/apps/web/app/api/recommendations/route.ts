/**
 * API Route for Story 4.3: Recommendations
 * GET /api/recommendations - Get personalized style recommendations
 *
 * Features:
 * - API-level caching with 1-hour TTL (Redis in production, in-memory in dev)
 * - Cache key includes user ID, type, and limit for granular caching
 * - Automatic cache invalidation on new orders (handled by order completion webhook)
 *
 * Note: Cache invalidation utility is in @/lib/utils/cache/recommendations-cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { recommendationEngineService } from '@/lib/services/recommendation-engine.service';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { createCacheService } from '@/lib/services/cache.service';
import type { RecommendationType } from '@sew4mi/shared/types';

// Initialize cache service (Redis in production, in-memory in dev)
const cacheService = createCacheService();

// Cache TTL: 1 hour (as specified in story requirements)
const CACHE_TTL_SECONDS = 60 * 60;

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as RecommendationType | null;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate parameters
    if (type && !['garment', 'tailor', 'fabric'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: garment, tailor, fabric' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Generate cache key with user ID, type, and limit
    const cacheKey = `recommendations:${user.id}:${type || 'all'}:${limit}`;

    // Try to get from cache
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return NextResponse.json(
        { ...cachedResult, cached: true },
        {
          status: 200,
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
          }
        }
      );
    }

    // Cache miss - compute recommendations
    const result = await recommendationEngineService.getRecommendations(user.id, {
      type: type || undefined,
      limit,
    });

    // Store in cache
    await cacheService.set(cacheKey, result, CACHE_TTL_SECONDS);

    return NextResponse.json(
      { ...result, cached: false },
      {
        status: 200,
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}`,
        }
      }
    );
  } catch (error) {
    console.error('GET /api/recommendations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
