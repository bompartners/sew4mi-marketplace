import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tailorProfileService } from '@/lib/services/tailor-profile.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const tailorId = (await params).id;
    const profile = await tailorProfileService.getCompleteProfile(tailorId);

    if (!profile) {
      return NextResponse.json(
        { error: 'Tailor profile not found' },
        { status: 404 }
      );
    }

    // Remove sensitive information for non-owners
    if (!user || profile.userId !== user.id) {
      // Hide sensitive data for public viewing
      delete (profile as any).bankAccountDetails;
      delete (profile as any).mobileMoneyDetails;
    }

    return NextResponse.json({
      data: profile,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching tailor profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tailor profile' },
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
    const updates = await _request.json();

    const updatedProfile = await tailorProfileService.updateProfile(
      user.id,
      tailorId,
      updates
    );

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: updatedProfile,
      success: true,
    });
  } catch (error) {
    console.error('Error updating tailor profile:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized to update this profile' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update tailor profile' },
      { status: 500 }
    );
  }
}