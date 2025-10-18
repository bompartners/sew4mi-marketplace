import { NextRequest, NextResponse } from 'next/server';
import { SavedSearchInputSchema } from '@sew4mi/shared';
import { savedSearchService } from '@/lib/services/saved-search.service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * POST /api/search/save
 * Save a new search with optional alerts
 * Story 4.4: Advanced Search and Filtering
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const input = SavedSearchInputSchema.parse(body);

    // Save the search
    const savedSearch = await savedSearchService.saveSearch(user.id, input);

    return NextResponse.json(savedSearch, { status: 201 });
  } catch (error) {
    console.error('Save search API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
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
