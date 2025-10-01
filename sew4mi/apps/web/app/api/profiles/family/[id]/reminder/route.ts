import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { ReminderFrequency } from '@sew4mi/shared/types/family-profiles';
import { familyProfileService } from '@/lib/services/family-profile.service';
import { notificationService } from '@/lib/services/notification.service';

const ScheduleReminderSchema = z.object({
  frequency: z.nativeEnum(ReminderFrequency),
  notificationChannels: z.array(z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'PUSH'])),
  customMessage: z.string().optional(),
  advanceNotice: z.number().min(1).max(30).default(7),
  reminderType: z.enum(['measurement-update', 'growth-check', 'milestone-check', 'custom']).default('measurement-update')
});

type ScheduleReminderRequest = z.infer<typeof ScheduleReminderSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get authenticated user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const profileId = params.id;
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = ScheduleReminderSchema.parse(body);

    // Verify profile ownership
    const profile = await familyProfileService.getProfile(profileId, session.user.id);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate next reminder date based on frequency and advance notice
    const calculateNextReminderDate = (frequency: ReminderFrequency, advanceNotice: number): Date => {
      const now = new Date();
      const nextReminder = new Date(now);
      
      // Subtract advance notice days
      nextReminder.setDate(now.getDate() + advanceNotice);
      
      switch (frequency) {
        case ReminderFrequency.MONTHLY:
          nextReminder.setMonth(now.getMonth() + 1);
          break;
        case ReminderFrequency.QUARTERLY:
          nextReminder.setMonth(now.getMonth() + 3);
          break;
        case ReminderFrequency.BIANNUALLY:
          nextReminder.setMonth(now.getMonth() + 6);
          break;
        case ReminderFrequency.ANNUALLY:
          nextReminder.setFullYear(now.getFullYear() + 1);
          break;
        default:
          // For NEVER, set a far future date
          nextReminder.setFullYear(now.getFullYear() + 100);
      }
      
      return nextReminder;
    };

    const nextReminderDate = calculateNextReminderDate(validatedData.frequency, validatedData.advanceNotice);

    // Update profile with reminder settings
    const updatedProfile = await familyProfileService.updateProfile(profileId, session.user.id, {
      growthTracking: {
        ...profile.growthTracking,
        isTrackingEnabled: validatedData.frequency !== ReminderFrequency.NEVER,
        reminderFrequency: validatedData.frequency,
        nextReminderDate,
        notificationChannels: validatedData.notificationChannels,
        customMessage: validatedData.customMessage,
        reminderType: validatedData.reminderType
      },
      lastUpdated: new Date()
    });

    // Schedule the reminder in the notification system
    if (validatedData.frequency !== ReminderFrequency.NEVER) {
      const reminderData = {
        id: `family-profile-${profileId}-${validatedData.reminderType}`,
        profileId: profileId,
        profileName: profile.nickname,
        userId: session.user.id,
        type: validatedData.reminderType,
        scheduledDate: nextReminderDate,
        frequency: validatedData.frequency,
        message: validatedData.customMessage || getDefaultReminderMessage(profile.nickname, validatedData.reminderType),
        channels: validatedData.notificationChannels,
        priority: calculateReminderPriority(profile.age, validatedData.reminderType),
        metadata: {
          profileId,
          relationship: profile.relationship,
          age: profile.age
        }
      };

      await notificationService.scheduleReminder(reminderData);
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder scheduled successfully',
      reminder: {
        frequency: validatedData.frequency,
        nextReminderDate,
        channels: validatedData.notificationChannels,
        isActive: validatedData.frequency !== ReminderFrequency.NEVER
      }
    });

  } catch (error) {
    console.error('Error scheduling reminder:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to schedule reminder' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const profileId = params.id;
    
    // Verify profile ownership
    const profile = await familyProfileService.getProfile(profileId, session.user.id);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 404 }
      );
    }

    // Update profile to disable reminders
    await familyProfileService.updateProfile(profileId, session.user.id, {
      growthTracking: {
        ...profile.growthTracking,
        isTrackingEnabled: false,
        reminderFrequency: ReminderFrequency.NEVER,
        nextReminderDate: undefined
      },
      lastUpdated: new Date()
    });

    // Cancel scheduled reminders
    await notificationService.cancelReminder(`family-profile-${profileId}-measurement-update`);
    await notificationService.cancelReminder(`family-profile-${profileId}-growth-check`);
    await notificationService.cancelReminder(`family-profile-${profileId}-milestone-check`);

    return NextResponse.json({
      success: true,
      message: 'Reminders cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling reminder:', error);
    return NextResponse.json(
      { error: 'Failed to cancel reminders' },
      { status: 500 }
    );
  }
}

function getDefaultReminderMessage(nickname: string, reminderType: string): string {
  const messages = {
    'measurement-update': `Time to update ${nickname}'s measurements! 📏`,
    'growth-check': `${nickname} is growing fast! Let's check their measurements 🌱`,
    'milestone-check': `${nickname} might have reached a new growth milestone! 🎉`,
    'custom': `Reminder for ${nickname}'s profile 📝`
  };

  return messages[reminderType as keyof typeof messages] || messages.custom;
}

function calculateReminderPriority(age?: number, reminderType?: string): 'low' | 'medium' | 'high' {
  if (!age) return 'medium';
  
  // Children under 5 get high priority (growing fast)
  if (age < 5) return 'high';
  
  // Children 5-12 get medium priority
  if (age < 13) return 'medium';
  
  // Growth check reminders for teens are medium priority
  if (age < 18 && reminderType === 'growth-check') return 'medium';
  
  // Adults get low priority unless it's milestone check
  return reminderType === 'milestone-check' ? 'medium' : 'low';
}