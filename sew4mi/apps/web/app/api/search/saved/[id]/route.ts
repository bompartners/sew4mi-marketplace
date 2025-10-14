import { NextRequest, NextResponse } from 'next/server';
import { SavedSearchUpdateSchema } from '@sew4mi/shared';
import { savedSearchService } from '@/lib/services/saved-search.service';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';

/**
 * PUT /api/search/saved/[id]
 * Update an existing saved search
 * Story 4.4: Advanced Search and Filtering
 */
export async function PUT(
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

    // Parse and validate request body
    const body = await request.json();
    const update = SavedSearchUpdateSchema.parse(body);

    // Update the saved search
    const savedSearch = await savedSearchService.updateSavedSearch(
      id,
      user.id,
      update
    );

    return NextResponse.json(savedSearch);
  } catch (error) {
    console.error('Update saved search API error:', error);

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

/**
 * DELETE /api/search/saved/[id]
 * Delete a saved search
 * Story 4.4: Advanced Search and Filtering
 */
export async function DELETE(
  _request: NextRequest,
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

    // Delete the saved search
    const deleted = await savedSearchService.deleteSavedSearch(id, user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Saved search not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete saved search API error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
