import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { UserRepository } from '@/lib/repositories/userRepository'
import { profileUpdateSchema } from '@sew4mi/shared/schemas/auth.schema'
import { emailService } from '@/lib/services/emailService'

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = profileUpdateSchema.parse(body)

    // Update user profile
    const userRepository = new UserRepository(supabase)
    const updatedUser = await userRepository.updateProfile(session.user.id, validatedData)

    // Send welcome email if this is the first profile completion
    if (validatedData.full_name && updatedUser.email) {
      try {
        await emailService.sendWelcomeEmail({
          to: updatedUser.email,
          name: validatedData.full_name,
          role: updatedUser.role.toLowerCase() as 'customer' | 'tailor'
        })
      } catch (emailError) {
        // Log but don't fail the request
        console.error('Welcome email failed:', emailError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: updatedUser 
    })

  } catch (error) {
    console.error('Profile update API error:', error)
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with completion status
    const userRepository = new UserRepository(supabase)
    const userWithStatus = await userRepository.getUserWithProfileStatus(session.user.id)

    if (!userWithStatus) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      user: userWithStatus 
    })

  } catch (error) {
    console.error('Profile fetch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}