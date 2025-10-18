import { NextRequest, NextResponse } from 'next/server';
import { savedSearchService } from '@/lib/services/saved-search.service';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/search/saved/[id]/check
 * Check for new tailors matching a saved search
 * Story 4.4: Advanced Search and Filtering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    // Get the saved search to verify ownership
    const savedSearch = await savedSearchService.getSavedSearchById(id, user.id);
    if (!savedSearch) {
      return NextResponse.json(
        { error: 'Saved search not found' },
        { status: 404 }
      );
    }

    // Check for new matches
    const matches = await savedSearchService.checkSavedSearchMatches(
      id,
      since ? new Date(since) : undefined
    );

    return NextResponse.json({
      savedSearchId: id,
      matchCount: matches.length,
      matches,
    });
  } catch (error) {
    console.error('Check saved search matches API error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
