import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GarmentCategory } from '@sew4mi/shared/types';
import { GARMENT_TYPES, GARMENT_CATEGORIES } from '@sew4mi/shared/constants';

/**
 * GET /api/orders/garment-types
 * Retrieves available garment types with pricing and requirements
 * Query parameters:
 * - category: Filter by garment category (optional)
 * - active: Filter by active status (default: true)
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication (optional for public garment types)
    const { data: { user: _user } } = await supabase.auth.getUser(); // Not used in current implementation
    
    const { searchParams } = new URL(_request.url);
    const category = searchParams.get('category') as GarmentCategory | null;
    const activeOnly = searchParams.get('active') !== 'false'; // Default to true

    // Get garment types from constants (in production, this would come from database)
    let garmentTypes = Object.values(GARMENT_TYPES);

    // Filter by active status
    if (activeOnly) {
      garmentTypes = garmentTypes.filter(type => type.isActive);
    }

    // Filter by category if specified
    if (category && Object.values(GarmentCategory).includes(category)) {
      garmentTypes = garmentTypes.filter(type => type.category === category);
    }

    // Sort by category and then by name
    garmentTypes.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    // Format response with categories metadata
    const response = {
      garmentTypes,
      categories: GARMENT_CATEGORIES,
      totalCount: garmentTypes.length,
      filterApplied: {
        category: category || 'all',
        activeOnly
      }
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('Garment types fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/garment-types
 * Creates a new garment type (Admin only)
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin (in production, would check role from database)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || userProfile?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body (not currently implemented)
    // const body = await _request.json();
    
    // In production, this would create a new garment type in the database
    // For now, return a success response
    return NextResponse.json(
      { success: true, message: 'Garment type creation not implemented yet' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Garment type creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}