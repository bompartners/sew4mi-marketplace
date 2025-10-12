import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { tailorApplicationSchema } from '@sew4mi/shared';

const submissionSchema = tailorApplicationSchema.extend({
  userId: z.string().uuid('Invalid user ID')
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate the submission
    const validationResult = submissionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid application data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const applicationData = validationResult.data;

    // Verify the user ID matches the authenticated user
    if (applicationData.userId !== user.id) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    // Check if user already has a tailor application
    const { data: existingApplication } = await supabase
      .from('tailor_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    if (existingApplication) {
      return NextResponse.json(
        { 
          error: 'Application already exists',
          status: existingApplication.status 
        },
        { status: 409 }
      );
    }

    // Create the tailor application record
    const { data: application, error: insertError } = await supabase
      .from('tailor_applications')
      .insert({
        user_id: user.id,
        business_name: applicationData.businessName,
        business_type: applicationData.businessType,
        years_of_experience: applicationData.yearsOfExperience,
        specializations: applicationData.specializations,
        portfolio_description: applicationData.portfolioDescription,
        business_location: applicationData.businessLocation,
        workspace_photos: applicationData.workspacePhotos,
        references: applicationData.references.map(ref => ({
          name: ref.name,
          phone: ref.phone,
          relationship: ref.relationship
        })),
        business_registration_url: applicationData.businessRegistration,
        tax_id: applicationData.taxId,
        status: 'PENDING',
        submitted_at: new Date().toISOString(),
        metadata: {
          agreed_to_terms: applicationData.agreedToTerms,
          submission_ip: _request.headers.get('x-forwarded-for') || _request.headers.get('remote-addr'),
          user_agent: _request.headers.get('user-agent')
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert tailor application:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    // Update user role status to show they have a pending application
    const { error: updateError } = await supabase
      .from('users')
      .update({
        metadata: {
          tailor_application_id: application.id,
          tailor_application_status: 'PENDING'
        }
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user metadata:', updateError);
      // Don't fail the request as the application was saved
    }

    // Create audit log entry
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'tailor_applications',
        record_id: application.id,
        action: 'INSERT',
        old_values: null,
        new_values: application,
        user_id: user.id,
        metadata: {
          action_type: 'tailor_application_submitted',
          user_agent: _request.headers.get('user-agent'),
          ip_address: _request.headers.get('x-forwarded-for') || _request.headers.get('remote-addr')
        }
      });

    // Send notification email (in background)
    fetch(`${_request.nextUrl.origin}/api/notifications/tailor-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationId: application.id,
        userId: user.id,
        type: 'submitted'
      }),
    }).catch(error => {
      console.error('Failed to send notification email:', error);
      // Don't fail the main request
    });

    return NextResponse.json(
      {
        success: true,
        applicationId: application.id,
        message: 'Application submitted successfully'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Tailor application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's tailor application if it exists
    const { data: application, error } = await supabase
      .from('tailor_applications')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Failed to fetch tailor application:', error);
      return NextResponse.json(
        { error: 'Failed to fetch application' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      application: application || null,
      hasApplication: !!application
    });

  } catch (error) {
    console.error('Get tailor application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}