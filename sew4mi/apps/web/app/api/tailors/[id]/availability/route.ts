import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { tailorProfileService } from '@/lib/services/tailor-profile.service';
import { UpdateAvailabilitySchema } from '@sew4mi/shared';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(_request.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const tailorId = (await params).id;
    const availability = await tailorProfileService.getAvailability(tailorId, startDate, endDate);

    return NextResponse.json({
      data: availability,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
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
    const result = UpdateAvailabilitySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.errors },
        { status: 400 }
      );
    }

    const availability = await tailorProfileService.updateAvailability(
      user.id,
      tailorId,
      result.data.date,
      result.data
    );

    if (!availability) {
      return NextResponse.json(
        { error: 'Failed to update availability' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: availability,
      success: true,
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized to update this availability' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}