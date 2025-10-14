import { NextRequest, NextResponse } from 'next/server';
import { savedSearchService } from '@/lib/services/saved-search.service';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/search/saved
 * Get all saved searches for the authenticated user
 * Story 4.4: Advanced Search and Filtering
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get saved searches
    const savedSearches = await savedSearchService.getSavedSearches(user.id);

    return NextResponse.json(savedSearches);
  } catch (error) {
    console.error('Get saved searches API error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
