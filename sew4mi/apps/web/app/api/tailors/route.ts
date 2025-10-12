import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('query') || '';
    const featuredOnly = searchParams.get('featured') === 'true';

    // Build the query
    let dbQuery = supabase
      .from('tailor_profiles')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('verification_status', 'VERIFIED')
      .eq('vacation_mode', false);

    // Apply filters
    if (query) {
      dbQuery = dbQuery.or(
        `business_name.ilike.%${query}%,specializations.cs.{${query}},location_name.ilike.%${query}%,city.ilike.%${query}%`
      );
    }

    // Fetch data
    const { data: tailors, error } = await dbQuery
      .order('rating', { ascending: false })
      .order('total_reviews', { ascending: false });

    if (error) {
      console.error('Error fetching tailors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tailors' },
        { status: 500 }
      );
    }

    // Transform data to match the expected format
    const transformedTailors = (tailors || []).map((tailor: any) => {
      const priceTiers = tailor.pricing_tiers || { basic: {}, premium: {}, luxury: {} };
      const basicPrice = priceTiers.basic?.price_min || 0;
      const luxuryPrice = priceTiers.luxury?.price_max || 0;

      return {
        id: tailor.id,
        userId: tailor.user_id,
        name: tailor.business_name,
        fullName: tailor.users?.full_name || '',
        email: tailor.users?.email || '',
        avatarUrl: tailor.users?.avatar_url || null,
        bio: tailor.bio,
        specialty: tailor.specializations?.[0] || 'General Tailoring',
        specializations: tailor.specializations || [],
        rating: parseFloat(tailor.rating) || 0,
        totalReviews: tailor.total_reviews || 0,
        location: tailor.location_name || tailor.city || '',
        city: tailor.city,
        region: tailor.region,
        deliveryRadius: parseFloat(tailor.delivery_radius_km) || 10,
        priceRange: `GHS ${basicPrice}-${luxuryPrice}`,
        completedOrders: tailor.total_orders || 0,
        completionRate: parseFloat(tailor.completion_rate) || 0,
        responseTime: tailor.response_time_hours ? `< ${Math.ceil(tailor.response_time_hours)} hours` : 'N/A',
        responseTimeHours: parseFloat(tailor.response_time_hours) || null,
        acceptsRushOrders: tailor.accepts_rush_orders || false,
        rushOrderFeePercentage: parseFloat(tailor.rush_order_fee_percentage) || 0,
        instagramHandle: tailor.instagram_handle,
        facebookPage: tailor.facebook_page,
        tiktokHandle: tailor.tiktok_handle,
        workingHours: tailor.working_hours || {},
        vacationMode: tailor.vacation_mode || false,
        featured: tailor.total_reviews > 100 && parseFloat(tailor.rating) >= 4.7,
        verified: tailor.verification_status === 'VERIFIED',
        verificationDate: tailor.verification_date,
        createdAt: tailor.created_at,
        updatedAt: tailor.updated_at
      };
    });

    // Apply featured filter if requested
    const filteredTailors = featuredOnly
      ? transformedTailors.filter((t: any) => t.featured)
      : transformedTailors;

    return NextResponse.json({
      tailors: filteredTailors,
      total: filteredTailors.length,
      success: true
    });
  } catch (error) {
    console.error('Unexpected error in tailors API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
