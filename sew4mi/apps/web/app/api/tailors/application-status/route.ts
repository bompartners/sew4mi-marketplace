import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get the tailor application and profile status for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has a tailor profile (approved)
    const { data: tailorProfile, error: profileError } = await supabase
      .from('tailor_profiles')
      .select('id, user_id, status, created_at')
      .eq('user_id', user.id)
      .single();

    // If user has a tailor profile, they're approved
    if (tailorProfile && !profileError) {
      return NextResponse.json({
        status: 'APPROVED',
        hasProfile: true,
        hasApplication: true,
        profileId: tailorProfile.id,
        message: 'Your tailor profile is active'
      });
    }

    // Check if user has a pending/rejected application
    const { data: application, error: appError } = await supabase
      .from('tailor_applications')
      .select('id, status, submitted_at, reviewed_at, rejection_reason')
      .eq('user_id', user.id)
      .single();

    // No application found
    if (appError && appError.code === 'PGRST116') {
      return NextResponse.json({
        status: 'NO_APPLICATION',
        hasProfile: false,
        hasApplication: false,
        message: 'No tailor application found. Please complete your application.'
      });
    }

    // Application exists
    if (application) {
      return NextResponse.json({
        status: application.status,
        hasProfile: false,
        hasApplication: true,
        applicationId: application.id,
        submittedAt: application.submitted_at,
        reviewedAt: application.reviewed_at,
        rejectionReason: application.rejection_reason,
        message: getStatusMessage(application.status, application.submitted_at)
      });
    }

    // Fallback - no application
    return NextResponse.json({
      status: 'NO_APPLICATION',
      hasProfile: false,
      hasApplication: false,
      message: 'No tailor application found'
    });

  } catch (error) {
    console.error('Error checking tailor application status:', error);
    return NextResponse.json(
      { error: 'Failed to check application status' },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string, submittedAt?: string): string {
  switch (status) {
    case 'PENDING':
      const daysAgo = submittedAt 
        ? Math.floor((Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      return `Your application is under review. Submitted ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago.`;
    case 'APPROVED':
      return 'Your application has been approved!';
    case 'REJECTED':
      return 'Your application was not approved. Please review the feedback and reapply.';
    case 'UNDER_REVIEW':
      return 'Our team is currently reviewing your application.';
    default:
      return 'Application status unknown.';
  }
}

