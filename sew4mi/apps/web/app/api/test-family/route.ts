import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('🧪 Test endpoint: Starting...');

    // Step 1: Create client
    const supabase = await createClient();
    console.log('✅ Supabase client created');

    // Step 2: Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔐 Auth check:', { hasUser: !!user, authError: authError?.message });

    if (authError || !user) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: authError?.message
      }, { status: 401 });
    }

    // Step 3: Try direct query
    console.log('🔍 Querying measurement_profiles for user:', user.id);
    const { data, error, count } = await supabase
      .from('measurement_profiles')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    console.log('📊 Query result:', {
      success: !error,
      count,
      dataLength: data?.length,
      error: error?.message
    });

    if (error) {
      return NextResponse.json({
        error: 'Database query failed',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test successful',
      userId: user.id,
      profileCount: count,
      profiles: data
    });

  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
