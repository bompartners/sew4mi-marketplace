/**
 * Family Profiles API Routes
 * RESTful endpoints for family member profile management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { FamilyProfileService } from '@/lib/services/family-profile.service';
import {
  CreateFamilyProfileRequest,
  FamilyProfilesListRequest,
  RelationshipType
} from '@sew4mi/shared/types/family-profiles';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const relationship = searchParams.get('relationship') as RelationshipType | null;
    const sortBy = searchParams.get('sortBy') as 'nickname' | 'age' | 'lastUpdated' | 'relationship' | null;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

    const filters: FamilyProfilesListRequest = {
      includeInactive,
      relationship: relationship || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined
    };

    const familyProfileService = new FamilyProfileService(supabase);
    const result = await familyProfileService.getFamilyProfiles(user.id, filters);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching family profiles:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    if (error instanceof Error) {
      return NextResponse.json({
        error: error.message,
        details: error.stack,
        type: error.constructor.name
      }, { status: 500 });
    }

    return NextResponse.json({
      error: 'Failed to fetch family profiles',
      details: String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const profileData: CreateFamilyProfileRequest = await request.json();

    // Validate required fields
    if (!profileData.nickname || !profileData.relationship || !profileData.gender) {
      return NextResponse.json({
        error: 'Missing required fields: nickname, relationship, gender'
      }, { status: 400 });
    }

    if (!profileData.measurements || Object.keys(profileData.measurements).length === 0) {
      return NextResponse.json({
        error: 'At least one measurement is required'
      }, { status: 400 });
    }

    // Create the family profile
    const familyProfileService = new FamilyProfileService(supabase);
    const result = await familyProfileService.createFamilyProfile(user.id, profileData);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        errors: result.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.profile,
      warnings: result.errors || []
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating family profile:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: 'Failed to create family profile' 
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