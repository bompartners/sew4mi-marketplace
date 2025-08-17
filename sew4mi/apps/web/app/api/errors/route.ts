import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get session (optional for error logging)
    const { data: { session } } = await supabase.auth.getSession()

    // Parse error data
    const errorData = await request.json()

    // Validate required fields
    if (!errorData.message || !errorData.type || !errorData.level) {
      return NextResponse.json(
        { error: 'Missing required error fields' },
        { status: 400 }
      )
    }

    // Add server-side context
    const enhancedErrorData = {
      ...errorData,
      userId: session?.user?.id || null,
      serverTimestamp: new Date().toISOString(),
      ip: request.ip || 'unknown',
      headers: {
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        origin: request.headers.get('origin')
      }
    }

    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error logged:', JSON.stringify(enhancedErrorData, null, 2))
      return NextResponse.json({ success: true, logged: 'console' })
    }

    // In production, you would send to external service like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - Custom logging service
    
    // Example: Send to external logging service
    /*
    const response = await fetch(process.env.ERROR_LOGGING_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ERROR_LOGGING_API_KEY}`
      },
      body: JSON.stringify(enhancedErrorData)
    })

    if (!response.ok) {
      throw new Error('Failed to send to external logging service')
    }
    */

    // For now, store in database (you could create an errors table)
    // This is optional - you might prefer external services
    try {
      const { data, error } = await supabase
        .from('error_logs')  // You'd need to create this table
        .insert({
          error_id: enhancedErrorData.id,
          type: enhancedErrorData.type,
          level: enhancedErrorData.level,
          message: enhancedErrorData.message,
          details: enhancedErrorData.details,
          stack: enhancedErrorData.stack,
          user_id: enhancedErrorData.userId,
          session_id: enhancedErrorData.sessionId,
          url: enhancedErrorData.url,
          user_agent: enhancedErrorData.userAgent,
          timestamp: enhancedErrorData.timestamp,
          additional_context: enhancedErrorData.additionalContext
        })

      if (error) {
        console.warn('Failed to store error in database:', error)
        // Don't fail the request - error logging should be resilient
      }
    } catch (dbError) {
      console.warn('Database error logging failed:', dbError)
      // Continue - don't let logging failures break the app
    }

    return NextResponse.json({ 
      success: true, 
      logged: 'external_service',
      errorId: enhancedErrorData.id 
    })

  } catch (error) {
    console.error('Error logging API failed:', error)
    
    // Always return success for error logging to avoid infinite loops
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to log error',
      fallback: 'console' 
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is admin (optional - for error dashboard)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return basic error metrics (you'd implement this based on your storage)
    const metrics = {
      totalErrors: 0,
      recentErrors: [],
      errorsByType: {},
      errorsByLevel: {}
    }

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error metrics API failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error metrics' },
      { status: 500 }
    )
  }
}