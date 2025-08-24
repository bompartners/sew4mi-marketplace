import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  USER_ROLES, 
  hasPermission, 
  PERMISSIONS, 
  canManageUser,
  adminRoleChangeSchema 
} from '@sew4mi/shared';

export async function POST(_request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user (admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await _request.json();
    
    // Validate request body
    const validationResult = adminRoleChangeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { userId, newRole, reason } = validationResult.data;

    // Get admin user role from database
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json(
        { error: 'Failed to fetch admin role' },
        { status: 403 }
      );
    }

    // Check if user has permission to edit roles
    if (!hasPermission(adminData.role, PERMISSIONS.EDIT_USER_ROLES)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit user roles' },
        { status: 403 }
      );
    }

    // Get target user's current role
    const { data: targetUserData, error: targetError } = await supabase
      .from('users')
      .select('role, email, full_name')
      .eq('id', userId)
      .single();

    if (targetError || !targetUserData) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Check if admin can manage this user (role hierarchy)
    if (!canManageUser(adminData.role, targetUserData.role)) {
      return NextResponse.json(
        { error: 'Cannot manage user with this role' },
        { status: 403 }
      );
    }

    // Check if admin can assign the new role
    if (!canManageUser(adminData.role, newRole)) {
      return NextResponse.json(
        { error: 'Cannot assign this role level' },
        { status: 403 }
      );
    }

    // Prevent role change to the same role
    if (targetUserData.role === newRole) {
      return NextResponse.json(
        { error: 'User already has this role' },
        { status: 400 }
      );
    }

    // Use the database function for role changes to ensure proper audit logging
    const { data: roleChangeResult, error: roleChangeError } = await supabase
      .rpc('admin_change_user_role', {
        target_user_id: userId,
        new_role: newRole,
        admin_user_id: user.id,
        reason: reason || 'Admin role change via dashboard'
      });

    if (roleChangeError) {
      console.error('Role change function error:', roleChangeError);
      return NextResponse.json(
        { error: 'Failed to change user role' },
        { status: 500 }
      );
    }

    // Check if the function returned an error
    if (!roleChangeResult || !roleChangeResult.success) {
      return NextResponse.json(
        { error: roleChangeResult?.error || 'Role change failed' },
        { status: 400 }
      );
    }

    // If changing to tailor role, also check for existing tailor application
    if (newRole === USER_ROLES.TAILOR) {
      // Check if user has a pending tailor application
      const { data: applicationData } = await supabase
        .from('tailor_applications')
        .select('id, status')
        .eq('user_id', userId)
        .single();

      if (applicationData && applicationData.status === 'PENDING') {
        // Approve the application
        await supabase
          .from('tailor_applications')
          .update({
            status: 'APPROVED',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            reviewer_notes: 'Approved via admin role change'
          })
          .eq('id', applicationData.id);
      }
    }

    // Create a notification for the user (optional)
    try {
      await fetch(`${_request.nextUrl.origin}/api/notifications/role-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          oldRole: targetUserData.role,
          newRole,
          adminId: user.id,
          reason
        }),
      });
    } catch (notificationError) {
      console.error('Failed to send role change notification:', notificationError);
      // Don't fail the main request
    }

    return NextResponse.json({
      success: true,
      message: `User role changed from ${targetUserData.role} to ${newRole}`,
      data: {
        userId,
        oldRole: targetUserData.role,
        newRole,
        adminId: user.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Admin role change error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user role from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to fetch user role' },
        { status: 403 }
      );
    }

    // Check permissions
    if (!hasPermission(userData.role, PERMISSIONS.VIEW_AUDIT_LOGS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get recent role changes
    const { data: recentChanges, error: changesError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        performed_at,
        old_values,
        new_values,
        metadata,
        users!audit_logs_user_id_fkey(email, full_name)
      `)
      .eq('table_name', 'users')
      .contains('metadata', { action_type: 'admin_role_change' })
      .order('performed_at', { ascending: false })
      .limit(50);

    if (changesError) {
      console.error('Failed to fetch role changes:', changesError);
      return NextResponse.json(
        { error: 'Failed to fetch role changes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      recentChanges: recentChanges || []
    });

  } catch (error) {
    console.error('Get role changes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}