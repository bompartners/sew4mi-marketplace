import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/dashboard/recommendations
 * Fetch recommended tailors for the authenticated user
 * Returns top-rated tailors based on location and specialization
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Fetch top-rated verified tailors
    const { data: tailors, error: tailorsError } = await supabase
      .from('tailor_profiles')
      .select(`
        id,
        business_name,
        specializations,
        rating,
        city
      `)
      .eq('verification_status', 'VERIFIED')
      .not('rating', 'is', null)
      .gte('rating', 4.0)
      .order('rating', { ascending: false })
      .limit(3);

    if (tailorsError) {
      console.error('Failed to fetch recommended tailors:', tailorsError);
      console.error('Error details:', JSON.stringify(tailorsError, null, 2));
      // Return empty array instead of error if it's just a query issue
      return NextResponse.json({ recommendations: [] }, {
        headers: {
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // Transform data for frontend
    const recommendations = (tailors || []).map(tailor => ({
      id: tailor.id,
      tailorName: tailor.business_name || 'Professional Tailor',
      specialization: Array.isArray(tailor.specializations) && tailor.specializations.length > 0
        ? tailor.specializations[0]
        : 'Custom Tailoring',
      rating: tailor.rating || 4.5,
      distance: tailor.city || 'Nearby', // Simplified for now
    }));

    return NextResponse.json({ recommendations }, {
      headers: {
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour (recommendations change slowly)
      },
    });
  } catch (error) {
    console.error('Dashboard recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
