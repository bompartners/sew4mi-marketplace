/**
 * Supabase Edge Function for processing saved search alerts
 * Checks for new tailors matching saved searches and sends notifications
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SavedSearch, TailorSearchFilters } from '../../../packages/shared/src/types/search.ts'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER')

// Create Supabase client with service role for bypassing RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface AlertCheckRequest {
  frequency?: 'instant' | 'daily' | 'weekly'
  limit?: number
}

interface NotificationPayload {
  customerId: string
  customerPhone?: string
  customerEmail?: string
  searchName: string
  newMatchesCount: number
  topMatches: any[]
}

/**
 * Check instant alerts (runs every 15 minutes)
 */
async function checkInstantAlerts() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: savedSearches, error } = await supabase
    .from('saved_searches')
    .select(`
      *,
      customer:users!customer_id (
        id,
        email,
        phone_number,
        whatsapp_number,
        whatsapp_opted_in
      )
    `)
    .eq('alert_enabled', true)
    .eq('alert_frequency', 'instant')
    .or(`last_notified_at.is.null,last_notified_at.lt.${fifteenMinutesAgo}`)

  if (error) {
    console.error('Error fetching instant alerts:', error)
    return { error: error.message }
  }

  const results = await processAlerts(savedSearches)
  return { processed: results.length, results }
}

/**
 * Check daily alerts (runs at 8 AM Ghana time)
 */
async function checkDailyAlerts() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: savedSearches, error } = await supabase
    .from('saved_searches')
    .select(`
      *,
      customer:users!customer_id (
        id,
        email,
        phone_number,
        whatsapp_number,
        whatsapp_opted_in
      )
    `)
    .eq('alert_enabled', true)
    .eq('alert_frequency', 'daily')
    .or(`last_notified_at.is.null,last_notified_at.lt.${oneDayAgo}`)

  if (error) {
    console.error('Error fetching daily alerts:', error)
    return { error: error.message }
  }

  const results = await processAlerts(savedSearches)
  return { processed: results.length, results }
}

/**
 * Check weekly alerts (runs Mondays at 8 AM Ghana time)
 */
async function checkWeeklyAlerts() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: savedSearches, error } = await supabase
    .from('saved_searches')
    .select(`
      *,
      customer:users!customer_id (
        id,
        email,
        phone_number,
        whatsapp_number,
        whatsapp_opted_in
      )
    `)
    .eq('alert_enabled', true)
    .eq('alert_frequency', 'weekly')
    .or(`last_notified_at.is.null,last_notified_at.lt.${oneWeekAgo}`)

  if (error) {
    console.error('Error fetching weekly alerts:', error)
    return { error: error.message }
  }

  const results = await processAlerts(savedSearches)
  return { processed: results.length, results }
}

/**
 * Process alerts and check for new matches
 */
async function processAlerts(savedSearches: any[]): Promise<any[]> {
  const results = []

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10
  for (let i = 0; i < savedSearches.length; i += batchSize) {
    const batch = savedSearches.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (savedSearch) => {
        try {
          const newMatches = await findNewMatches(savedSearch)

          if (newMatches.length > 0) {
            await sendNotification({
              customerId: savedSearch.customer_id,
              customerPhone: savedSearch.customer?.whatsapp_number || savedSearch.customer?.phone_number,
              customerEmail: savedSearch.customer?.email,
              searchName: savedSearch.name,
              newMatchesCount: newMatches.length,
              topMatches: newMatches.slice(0, 3)
            })

            // Update last notified timestamp
            await supabase
              .from('saved_searches')
              .update({ last_notified_at: new Date().toISOString() })
              .eq('id', savedSearch.id)

            return {
              searchId: savedSearch.id,
              searchName: savedSearch.name,
              newMatches: newMatches.length,
              status: 'notified'
            }
          }

          return {
            searchId: savedSearch.id,
            searchName: savedSearch.name,
            newMatches: 0,
            status: 'no_new_matches'
          }
        } catch (error) {
          console.error(`Error processing alert ${savedSearch.id}:`, error)
          return {
            searchId: savedSearch.id,
            searchName: savedSearch.name,
            error: error.message,
            status: 'error'
          }
        }
      })
    )

    results.push(...batchResults)

    // Add delay between batches to respect rate limits
    if (i + batchSize < savedSearches.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * Find new tailors matching saved search filters
 */
async function findNewMatches(savedSearch: any): Promise<any[]> {
  const filters: TailorSearchFilters = savedSearch.filters
  const lastChecked = savedSearch.last_notified_at || savedSearch.created_at

  let query = supabase
    .from('tailor_profiles')
    .select(`
      id,
      business_name,
      bio,
      city,
      region,
      specializations,
      occasions,
      style_categories,
      fabric_specialties,
      languages_spoken,
      min_delivery_days,
      max_delivery_days,
      profile_image_url,
      rating,
      total_reviews,
      created_at
    `)
    .gt('created_at', lastChecked) // Only new tailors since last check
    .eq('verification_status', 'verified')
    .eq('is_active', true)

  // Apply filters
  if (filters.city) {
    query = query.eq('city', filters.city)
  }

  if (filters.region) {
    query = query.eq('region', filters.region)
  }

  if (filters.occasions?.length) {
    query = query.overlaps('occasions', filters.occasions)
  }

  if (filters.styleCategories?.length) {
    query = query.overlaps('style_categories', filters.styleCategories)
  }

  if (filters.fabricPreferences?.length) {
    query = query.overlaps('fabric_specialties', filters.fabricPreferences)
  }

  if (filters.sizeRanges?.length) {
    query = query.overlaps('size_ranges', filters.sizeRanges)
  }

  if (filters.languages?.length) {
    query = query.overlaps('languages_spoken', filters.languages)
  }

  if (filters.specializations?.length) {
    query = query.overlaps('specializations', filters.specializations)
  }

  if (filters.deliveryTimeframeMin !== undefined) {
    query = query.gte('min_delivery_days', filters.deliveryTimeframeMin)
  }

  if (filters.deliveryTimeframeMax !== undefined) {
    query = query.lte('max_delivery_days', filters.deliveryTimeframeMax)
  }

  if (filters.minRating) {
    query = query.gte('rating', filters.minRating)
  }

  if (filters.minPrice) {
    query = query.gte('starting_price', filters.minPrice)
  }

  if (filters.maxPrice) {
    query = query.lte('starting_price', filters.maxPrice)
  }

  const { data, error } = await query.limit(10)

  if (error) {
    console.error('Error finding new matches:', error)
    return []
  }

  return data || []
}

/**
 * Send notification to customer about new matches
 */
async function sendNotification(payload: NotificationPayload): Promise<void> {
  const { customerId, customerPhone, customerEmail, searchName, newMatchesCount, topMatches } = payload

  // Format message
  const message = formatNotificationMessage(searchName, newMatchesCount, topMatches)

  // Send WhatsApp notification if phone is available and Twilio is configured
  if (customerPhone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    await sendWhatsAppNotification(customerPhone, message)
  }

  // Send email notification if email is available
  if (customerEmail) {
    await sendEmailNotification(customerEmail, searchName, newMatchesCount, topMatches)
  }

  // Log notification in database
  await logNotification(customerId, 'search_alert', message)
}

/**
 * Format notification message
 */
function formatNotificationMessage(searchName: string, count: number, topMatches: any[]): string {
  let message = `🔔 New tailors match your saved search "${searchName}"!\n\n`
  message += `Found ${count} new tailor${count > 1 ? 's' : ''} matching your criteria:\n\n`

  topMatches.forEach((tailor, index) => {
    message += `${index + 1}. ${tailor.business_name} (${tailor.city})\n`
    message += `   ⭐ ${tailor.rating || 'New'} rating\n`
    if (tailor.specializations?.length) {
      message += `   📍 ${tailor.specializations.slice(0, 2).join(', ')}\n`
    }
  })

  if (count > 3) {
    message += `\n... and ${count - 3} more!\n`
  }

  message += `\nView all matches: https://sew4mi.com/saved-searches`

  return message
}

/**
 * Send WhatsApp notification using Twilio
 */
async function sendWhatsAppNotification(phone: string, message: string): Promise<void> {
  const formattedPhone = formatGhanaPhone(phone)

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
          To: `whatsapp:${formattedPhone}`,
          Body: message,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('WhatsApp notification failed:', error)
    }
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error)
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  email: string,
  searchName: string,
  count: number,
  topMatches: any[]
): Promise<void> {
  // For now, log email notification
  // In production, integrate with email service (SendGrid, Resend, etc.)
  console.log('Email notification queued:', {
    to: email,
    subject: `New matches for "${searchName}" - Sew4Mi`,
    matchCount: count
  })
}

/**
 * Log notification in database
 */
async function logNotification(customerId: string, type: string, message: string): Promise<void> {
  await supabase
    .from('notification_logs')
    .insert({
      customer_id: customerId,
      type,
      message,
      sent_at: new Date().toISOString()
    })
}

/**
 * Format Ghana phone number
 */
function formatGhanaPhone(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '')

  // If starts with 233, return as is
  if (cleaned.startsWith('233')) {
    return `+${cleaned}`
  }

  // If starts with 0, replace with 233
  if (cleaned.startsWith('0')) {
    return `+233${cleaned.substring(1)}`
  }

  // Otherwise, assume it's missing country code
  return `+233${cleaned}`
}

/**
 * Main handler for the edge function
 */
serve(async (req) => {
  try {
    // Parse request - support both GET (query params) and POST (JSON body)
    let frequency: string | undefined
    let limit: number | undefined

    if (req.method === 'GET') {
      // Parse query parameters for GET requests
      const url = new URL(req.url)
      frequency = url.searchParams.get('frequency') || undefined
      const limitParam = url.searchParams.get('limit')
      limit = limitParam ? parseInt(limitParam) : undefined
    } else {
      // Parse JSON body for POST requests
      try {
        const body = await req.json() as AlertCheckRequest
        frequency = body.frequency
        limit = body.limit
      } catch (e) {
        // If JSON parsing fails, continue with undefined values
        console.log('No JSON body provided, using defaults')
      }
    }

    let result

    switch (frequency) {
      case 'instant':
        result = await checkInstantAlerts()
        break
      case 'daily':
        result = await checkDailyAlerts()
        break
      case 'weekly':
        result = await checkWeeklyAlerts()
        break
      default:
        // Check all frequencies
        const instant = await checkInstantAlerts()
        const daily = await checkDailyAlerts()
        const weekly = await checkWeeklyAlerts()
        result = { instant, daily, weekly }
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})