/**
 * Individual Family Profile API Routes
 * CRUD operations for specific family profiles
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { FamilyProfileService } from '@/lib/services/family-profile.service';
import { UpdateFamilyProfileRequest } from '@sew4mi/shared/types/family-profiles';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: profileId } = await params;
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    const familyProfileService = new FamilyProfileService(supabase);
    const profile = await familyProfileService.getFamilyProfile(user.id, profileId);
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Error fetching family profile:', error);
    
    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ 
      error: 'Failed to fetch family profile' 
    }, { status: 500 });
  }
}

export async function PUT(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: profileId } = await params;
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Parse request body
    const { updates }: { updates: UpdateFamilyProfileRequest['updates'] } = await request.json();
    
    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: 'No updates provided' 
      }, { status: 400 });
    }

    // Update the profile
    const familyProfileService = new FamilyProfileService(supabase);
    const updatedProfile = await familyProfileService.updateFamilyProfile(user.id, profileId, updates);

    return NextResponse.json({
      success: true,
      data: updatedProfile
    });

  } catch (error) {
    console.error('Error updating family profile:', error);
    
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 :
                    error.message.includes('Access denied') ? 403 :
                    error.message.includes('Invalid') ? 400 : 500;
      
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ 
      error: 'Failed to update family profile' 
    }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: profileId } = await params;
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Delete (archive) the profile
    const familyProfileService = new FamilyProfileService(supabase);
    await familyProfileService.deleteFamilyProfile(user.id, profileId);

    return NextResponse.json({
      success: true,
      message: 'Family profile deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting family profile:', error);
    
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 :
                    error.message.includes('Access denied') ? 403 : 500;
      
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ 
      error: 'Failed to delete family profile' 
    }, { status: 500 });
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}