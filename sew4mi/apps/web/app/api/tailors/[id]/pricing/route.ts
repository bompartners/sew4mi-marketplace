import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tailorProfileService } from '@/lib/services/tailor-profile.service';
import { UpdatePricingSchema } from '@sew4mi/shared';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tailorId = (await params).id;
    const pricing = await tailorProfileService.getPricing(tailorId);

    return NextResponse.json({
      data: pricing,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const tailorId = (await params).id;
    const body = await _request.json();

    // Validate the request body
    const result = UpdatePricingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.errors },
        { status: 400 }
      );
    }

    const pricing = await tailorProfileService.updatePricing(
      user.id,
      tailorId,
      result.data.garmentType,
      result.data
    );

    if (!pricing) {
      return NextResponse.json(
        { error: 'Failed to update pricing' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: pricing,
      success: true,
    });
  } catch (error) {
    console.error('Error updating pricing:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized to update this pricing' },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message.includes('price')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update pricing' },
      { status: 500 }
    );
  }
}