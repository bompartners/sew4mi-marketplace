/**
 * Tests for search alerts edge function
 * Tests notification logic and alert processing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { checkInstantAlerts, checkDailyAlerts, checkWeeklyAlerts, processAlerts, findNewMatches, sendNotification } from './index'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
}

// Mock Twilio
const mockTwilio = {
  messages: {
    create: vi.fn()
  }
}

// Mock environment variables
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')
vi.stubEnv('TWILIO_ACCOUNT_SID', 'test-sid')
vi.stubEnv('TWILIO_AUTH_TOKEN', 'test-token')
vi.stubEnv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')

describe('Search Alerts Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkInstantAlerts', () => {
    it('should check for instant alerts not notified in last 15 minutes', async () => {
      const mockSavedSearches = [
        {
          id: 'search-1',
          customer_id: 'customer-1',
          name: 'Wedding Tailors',
          filters: { occasions: ['Wedding'] },
          alert_enabled: true,
          alert_frequency: 'instant',
          last_notified_at: new Date('2024-01-15T09:30:00Z'), // 30 mins ago
          customer: {
            id: 'customer-1',
            phone: '+233241234567',
            email: 'customer1@example.com'
          }
        },
        {
          id: 'search-2',
          customer_id: 'customer-2',
          name: 'Local Tailors',
          filters: { city: 'Accra' },
          alert_enabled: true,
          alert_frequency: 'instant',
          last_notified_at: new Date('2024-01-15T09:50:00Z'), // 10 mins ago - should skip
          customer: {
            id: 'customer-2',
            phone: '+233241234568',
            email: 'customer2@example.com'
          }
        }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: mockSavedSearches, error: null }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      // Mock finding new matches
      global.findNewMatches = vi.fn().mockImplementation((search) => {
        if (search.id === 'search-1') {
          return Promise.resolve([
            { id: 'tailor-1', business_name: 'Elite Wedding Tailors' }
          ])
        }
        return Promise.resolve([])
      })

      // Mock sending notifications
      global.sendNotification = vi.fn().mockResolvedValue(undefined)

      const result = await checkInstantAlerts()

      expect(result.processed).toBe(2)
      expect(result.results[0].newMatches).toBe(1)
      expect(result.results[0].status).toBe('notified')
      expect(result.results[1].newMatches).toBe(0)
      expect(result.results[1].status).toBe('no_new_matches')
    })

    it('should handle errors during alert processing', async () => {
      const mockSavedSearches = [
        {
          id: 'search-error',
          customer_id: 'customer-error',
          name: 'Error Test',
          filters: {},
          alert_enabled: true,
          alert_frequency: 'instant',
          last_notified_at: null,
          customer: { id: 'customer-error' }
        }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: mockSavedSearches, error: null }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      global.findNewMatches = vi.fn().mockRejectedValue(new Error('Database error'))

      const result = await checkInstantAlerts()

      expect(result.results[0].status).toBe('error')
      expect(result.results[0].error).toBe('Database error')
    })
  })

  describe('checkDailyAlerts', () => {
    it('should check for daily alerts not notified in last 24 hours', async () => {
      const mockSavedSearches = [
        {
          id: 'search-daily',
          customer_id: 'customer-daily',
          name: 'Daily Alert',
          filters: { city: 'Kumasi' },
          alert_enabled: true,
          alert_frequency: 'daily',
          last_notified_at: new Date('2024-01-14T08:00:00Z'), // 26 hours ago
          customer: {
            id: 'customer-daily',
            phone: '+233241234569'
          }
        }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: mockSavedSearches, error: null }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      global.findNewMatches = vi.fn().mockResolvedValue([
        { id: 'tailor-2', business_name: 'Kumasi Tailors' },
        { id: 'tailor-3', business_name: 'Royal Threads' }
      ])

      global.sendNotification = vi.fn().mockResolvedValue(undefined)

      const result = await checkDailyAlerts()

      expect(result.processed).toBe(1)
      expect(result.results[0].newMatches).toBe(2)
      expect(global.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-daily',
          searchName: 'Daily Alert',
          newMatchesCount: 2
        })
      )
    })
  })

  describe('checkWeeklyAlerts', () => {
    it('should check for weekly alerts not notified in last 7 days', async () => {
      const mockSavedSearches = [
        {
          id: 'search-weekly',
          customer_id: 'customer-weekly',
          name: 'Weekly Digest',
          filters: { styleCategories: ['traditional'] },
          alert_enabled: true,
          alert_frequency: 'weekly',
          last_notified_at: new Date('2024-01-08T08:00:00Z'), // 7 days ago
          customer: {
            id: 'customer-weekly',
            email: 'weekly@example.com'
          }
        }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: mockSavedSearches, error: null }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      global.findNewMatches = vi.fn().mockResolvedValue([
        { id: 'tailor-4', business_name: 'Traditional Masters' }
      ])

      global.sendNotification = vi.fn().mockResolvedValue(undefined)

      const result = await checkWeeklyAlerts()

      expect(result.processed).toBe(1)
      expect(result.results[0].status).toBe('notified')
    })
  })

  describe('processAlerts', () => {
    it('should process alerts in batches to avoid rate limits', async () => {
      // Create 25 saved searches to test batching
      const savedSearches = Array.from({ length: 25 }, (_, i) => ({
        id: `search-${i}`,
        customer_id: `customer-${i}`,
        name: `Search ${i}`,
        filters: {},
        alert_enabled: true,
        alert_frequency: 'instant',
        last_notified_at: null,
        customer: { id: `customer-${i}` }
      }))

      global.findNewMatches = vi.fn().mockResolvedValue([])
      global.sendNotification = vi.fn().mockResolvedValue(undefined)

      const startTime = Date.now()
      const results = await processAlerts(savedSearches)
      const endTime = Date.now()

      expect(results).toHaveLength(25)

      // Should have processed in 3 batches (10, 10, 5)
      // With 2 delays of 1000ms between batches
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000)
    })

    it('should send notifications only when new matches are found', async () => {
      const savedSearches = [
        {
          id: 'search-with-matches',
          customer_id: 'customer-1',
          name: 'Has Matches',
          filters: {},
          customer: { phone: '+233241234567' }
        },
        {
          id: 'search-no-matches',
          customer_id: 'customer-2',
          name: 'No Matches',
          filters: {},
          customer: { phone: '+233241234568' }
        }
      ]

      global.findNewMatches = vi.fn().mockImplementation((search) => {
        if (search.id === 'search-with-matches') {
          return Promise.resolve([{ id: 'tailor-1' }])
        }
        return Promise.resolve([])
      })

      global.sendNotification = vi.fn().mockResolvedValue(undefined)

      const results = await processAlerts(savedSearches)

      expect(global.sendNotification).toHaveBeenCalledTimes(1)
      expect(global.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-1',
          searchName: 'Has Matches'
        })
      )
    })
  })

  describe('findNewMatches', () => {
    it('should apply all filter types when searching', async () => {
      const savedSearch = {
        id: 'search-complex',
        filters: {
          city: 'Accra',
          occasions: ['Wedding', 'Graduation'],
          styleCategories: ['traditional'],
          fabricPreferences: ['Kente'],
          sizeRanges: ['regular'],
          languages: ['EN', 'TWI'],
          deliveryTimeframeMin: 7,
          deliveryTimeframeMax: 14,
          minRating: 4.0,
          minPrice: 100,
          maxPrice: 500
        },
        last_notified_at: new Date('2024-01-14T00:00:00Z')
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({
          data: [
            { id: 'tailor-1', business_name: 'Perfect Match Tailors' }
          ],
          error: null
        }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const matches = await findNewMatches(savedSearch)

      // Verify all filters were applied
      expect(mockQuery.eq).toHaveBeenCalledWith('city', 'Accra')
      expect(mockQuery.eq).toHaveBeenCalledWith('verification_status', 'verified')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQuery.overlaps).toHaveBeenCalledWith('occasions', savedSearch.filters.occasions)
      expect(mockQuery.overlaps).toHaveBeenCalledWith('style_categories', savedSearch.filters.styleCategories)
      expect(mockQuery.overlaps).toHaveBeenCalledWith('fabric_specialties', savedSearch.filters.fabricPreferences)
      expect(mockQuery.overlaps).toHaveBeenCalledWith('size_ranges', savedSearch.filters.sizeRanges)
      expect(mockQuery.overlaps).toHaveBeenCalledWith('languages_spoken', savedSearch.filters.languages)
      expect(mockQuery.gte).toHaveBeenCalledWith('min_delivery_days', 7)
      expect(mockQuery.lte).toHaveBeenCalledWith('max_delivery_days', 14)
      expect(mockQuery.gte).toHaveBeenCalledWith('rating', 4.0)
      expect(mockQuery.gte).toHaveBeenCalledWith('starting_price', 100)
      expect(mockQuery.lte).toHaveBeenCalledWith('starting_price', 500)
      expect(mockQuery.gt).toHaveBeenCalledWith('created_at', savedSearch.last_notified_at)

      expect(matches).toHaveLength(1)
    })

    it('should use creation date when never notified before', async () => {
      const savedSearch = {
        id: 'search-new',
        filters: {},
        created_at: new Date('2024-01-10T00:00:00Z'),
        last_notified_at: null
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: [], error: null }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await findNewMatches(savedSearch)

      expect(mockQuery.gt).toHaveBeenCalledWith('created_at', savedSearch.created_at)
    })
  })

  describe('sendNotification', () => {
    it('should send WhatsApp notification when phone is available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue('Success')
      })

      const payload = {
        customerId: 'customer-1',
        customerPhone: '0241234567',
        customerEmail: 'test@example.com',
        searchName: 'Wedding Tailors',
        newMatchesCount: 3,
        topMatches: [
          { id: 't1', business_name: 'Elite Tailors', city: 'Accra', rating: 4.8 },
          { id: 't2', business_name: 'Royal Threads', city: 'Kumasi', rating: 4.6 },
          { id: 't3', business_name: 'Classic Cuts', city: 'Tema', rating: 4.5 }
        ]
      }

      await sendNotification(payload)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.twilio.com'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(URLSearchParams)
        })
      )

      const callArgs = global.fetch.mock.calls[0][1]
      const body = callArgs.body.toString()

      expect(body).toContain('whatsapp%3A%2B233241234567') // Formatted Ghana number
      expect(body).toContain('Wedding+Tailors')
      expect(body).toContain('3+new+tailor')
    })

    it('should format notification message correctly', () => {
      const message = formatNotificationMessage(
        'My Search',
        5,
        [
          { business_name: 'Tailor 1', city: 'Accra', rating: 4.5, specializations: ['Wedding', 'Traditional'] },
          { business_name: 'Tailor 2', city: 'Kumasi', rating: null },
          { business_name: 'Tailor 3', city: 'Tema', rating: 5.0 }
        ]
      )

      expect(message).toContain('🔔 New tailors match your saved search "My Search"')
      expect(message).toContain('Found 5 new tailors')
      expect(message).toContain('1. Tailor 1 (Accra)')
      expect(message).toContain('⭐ 4.5 rating')
      expect(message).toContain('📍 Wedding, Traditional')
      expect(message).toContain('2. Tailor 2 (Kumasi)')
      expect(message).toContain('⭐ New rating')
      expect(message).toContain('... and 2 more!')
      expect(message).toContain('https://sew4mi.com/saved-searches')
    })

    it('should handle Ghana phone number formatting', () => {
      expect(formatGhanaPhone('0241234567')).toBe('+233241234567')
      expect(formatGhanaPhone('233241234567')).toBe('+233241234567')
      expect(formatGhanaPhone('+233241234567')).toBe('+233241234567')
      expect(formatGhanaPhone('241234567')).toBe('+233241234567')
    })
  })

  describe('Edge Function Handler', () => {
    it('should handle instant frequency request', async () => {
      global.checkInstantAlerts = vi.fn().mockResolvedValue({
        processed: 5,
        results: []
      })

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ frequency: 'instant' })
      })

      const response = await serve(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.result.processed).toBe(5)
      expect(global.checkInstantAlerts).toHaveBeenCalled()
    })

    it('should handle all frequencies when none specified', async () => {
      global.checkInstantAlerts = vi.fn().mockResolvedValue({ processed: 1 })
      global.checkDailyAlerts = vi.fn().mockResolvedValue({ processed: 2 })
      global.checkWeeklyAlerts = vi.fn().mockResolvedValue({ processed: 3 })

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await serve(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.result.instant.processed).toBe(1)
      expect(data.result.daily.processed).toBe(2)
      expect(data.result.weekly.processed).toBe(3)
    })

    it('should handle errors gracefully', async () => {
      global.checkInstantAlerts = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ frequency: 'instant' })
      })

      const response = await serve(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database connection failed')
    })
  })
})