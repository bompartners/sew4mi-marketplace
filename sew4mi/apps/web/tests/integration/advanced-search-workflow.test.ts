/**
 * Integration tests for advanced search workflow
 * Tests the complete flow from UI to database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import request from 'supertest'
import { SavedSearchService } from '@/lib/services/saved-search.service'
import { TailorSearchService } from '@/lib/services/tailor-search.service'
import { SavedSearchRepository } from '@/lib/repositories/saved-search.repository'
import { TailorSearchRepository } from '@/lib/repositories/tailor-search.repository'
import type { SavedSearch, TailorSearchFilters } from '@sew4mi/shared/types'

// Test configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321'
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key'
const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Advanced Search Workflow Integration Tests', () => {
  let supabase: SupabaseClient
  let testUserId: string
  let testTailorIds: string[] = []
  let apiClient: any

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)

    // Create test user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'test-search@sew4mi.com',
      password: 'TestPassword123!'
    })

    if (userError) throw userError
    testUserId = user.user!.id

    // Create test tailors with various attributes
    const testTailors = [
      {
        user_id: testUserId + '-tailor1',
        business_name: 'Wedding Specialist Tailors',
        city: 'Accra',
        region: 'Greater Accra',
        occasions: ['Wedding', 'Engagement'],
        style_categories: ['traditional', 'contemporary'],
        fabric_specialties: ['Kente', 'Lace'],
        languages_spoken: ['EN', 'TWI'],
        size_ranges: ['regular', 'plus-size'],
        min_delivery_days: 7,
        max_delivery_days: 14,
        starting_price: 200,
        rating: 4.8,
        verification_status: 'verified',
        is_active: true
      },
      {
        user_id: testUserId + '-tailor2',
        business_name: 'Traditional Masters',
        city: 'Kumasi',
        region: 'Ashanti',
        occasions: ['Festival', 'Church Service'],
        style_categories: ['traditional'],
        fabric_specialties: ['Ankara', 'Batik'],
        languages_spoken: ['EN', 'GA'],
        size_ranges: ['petite', 'regular'],
        min_delivery_days: 10,
        max_delivery_days: 21,
        starting_price: 150,
        rating: 4.5,
        verification_status: 'verified',
        is_active: true
      },
      {
        user_id: testUserId + '-tailor3',
        business_name: 'Modern Fashion House',
        city: 'Accra',
        region: 'Greater Accra',
        occasions: ['Corporate Event', 'Birthday Party'],
        style_categories: ['contemporary', 'fusion'],
        fabric_specialties: ['Cotton', 'Silk'],
        languages_spoken: ['EN', 'EWE'],
        size_ranges: ['regular', 'tall'],
        min_delivery_days: 5,
        max_delivery_days: 10,
        starting_price: 300,
        rating: 4.9,
        verification_status: 'verified',
        is_active: true
      }
    ]

    // Insert test tailors
    const { data: insertedTailors, error: tailorError } = await supabase
      .from('tailor_profiles')
      .insert(testTailors)
      .select('id')

    if (tailorError) throw tailorError
    testTailorIds = insertedTailors.map(t => t.id)

    // Initialize API client
    apiClient = request.agent(TEST_API_URL)
    await apiClient
      .post('/api/auth/login')
      .send({ email: 'test-search@sew4mi.com', password: 'TestPassword123!' })
  })

  afterAll(async () => {
    // Cleanup test data
    if (testTailorIds.length > 0) {
      await supabase
        .from('tailor_profiles')
        .delete()
        .in('id', testTailorIds)
    }

    await supabase
      .from('saved_searches')
      .delete()
      .eq('customer_id', testUserId)

    await supabase.auth.signOut()
  })

  describe('Advanced Filter Search', () => {
    it('should filter by occasions correctly', async () => {
      const filters: TailorSearchFilters = {
        occasions: ['Wedding']
      }

      const response = await apiClient
        .get('/api/tailors/search')
        .query(filters)
        .expect(200)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].business_name).toBe('Wedding Specialist Tailors')
    })

    it('should filter by multiple criteria', async () => {
      const filters: TailorSearchFilters = {
        city: 'Accra',
        styleCategories: ['contemporary'],
        minRating: 4.5
      }

      const response = await apiClient
        .get('/api/tailors/search')
        .query({
          city: filters.city,
          styleCategories: filters.styleCategories?.join(','),
          minRating: filters.minRating
        })
        .expect(200)

      expect(response.body.items).toHaveLength(2)
      expect(response.body.items.every((t: any) => t.city === 'Accra')).toBe(true)
      expect(response.body.items.every((t: any) => t.rating >= 4.5)).toBe(true)
    })

    it('should filter by delivery timeframe', async () => {
      const filters: TailorSearchFilters = {
        deliveryTimeframeMin: 5,
        deliveryTimeframeMax: 10
      }

      const response = await apiClient
        .get('/api/tailors/search')
        .query(filters)
        .expect(200)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].business_name).toBe('Modern Fashion House')
    })

    it('should filter by languages spoken', async () => {
      const filters: TailorSearchFilters = {
        languages: ['EWE']
      }

      const response = await apiClient
        .get('/api/tailors/search')
        .query({
          languages: filters.languages?.join(',')
        })
        .expect(200)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].languages_spoken).toContain('EWE')
    })

    it('should filter by size ranges', async () => {
      const filters: TailorSearchFilters = {
        sizeRanges: ['plus-size']
      }

      const response = await apiClient
        .get('/api/tailors/search')
        .query({
          sizeRanges: filters.sizeRanges?.join(',')
        })
        .expect(200)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].size_ranges).toContain('plus-size')
    })

    it('should combine text search with filters', async () => {
      const filters: TailorSearchFilters = {
        query: 'traditional',
        city: 'Kumasi'
      }

      const response = await apiClient
        .get('/api/tailors/search')
        .query(filters)
        .expect(200)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].business_name).toBe('Traditional Masters')
    })
  })

  describe('Saved Search CRUD Operations', () => {
    let savedSearchId: string

    it('should save a new search', async () => {
      const searchData = {
        name: 'My Wedding Tailors',
        filters: {
          occasions: ['Wedding', 'Engagement'],
          city: 'Accra',
          minRating: 4.5
        },
        alertEnabled: true,
        alertFrequency: 'daily'
      }

      const response = await apiClient
        .post('/api/search/save')
        .send(searchData)
        .expect(201)

      expect(response.body).toMatchObject({
        name: searchData.name,
        filters: searchData.filters,
        alert_enabled: true,
        alert_frequency: 'daily'
      })

      savedSearchId = response.body.id
    })

    it('should list saved searches', async () => {
      const response = await apiClient
        .get('/api/search/saved')
        .expect(200)

      expect(response.body).toBeInstanceOf(Array)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body[0].name).toBe('My Wedding Tailors')
    })

    it('should update a saved search', async () => {
      const updates = {
        name: 'Updated Wedding Search',
        alertEnabled: false
      }

      const response = await apiClient
        .put(`/api/search/saved/${savedSearchId}`)
        .send(updates)
        .expect(200)

      expect(response.body.name).toBe('Updated Wedding Search')
      expect(response.body.alert_enabled).toBe(false)
    })

    it('should check for new matches', async () => {
      // First, add a new tailor that matches the saved search
      const newTailor = {
        user_id: testUserId + '-tailor-new',
        business_name: 'New Wedding Expert',
        city: 'Accra',
        region: 'Greater Accra',
        occasions: ['Wedding'],
        style_categories: ['contemporary'],
        rating: 4.9,
        verification_status: 'verified',
        is_active: true,
        created_at: new Date().toISOString()
      }

      const { data: insertedTailor } = await supabase
        .from('tailor_profiles')
        .insert(newTailor)
        .select('id')
        .single()

      testTailorIds.push(insertedTailor.id)

      // Check for new matches
      const response = await apiClient
        .get(`/api/search/saved/${savedSearchId}/check`)
        .expect(200)

      expect(response.body.newMatchCount).toBeGreaterThan(0)
      expect(response.body.newMatches).toBeInstanceOf(Array)
    })

    it('should delete a saved search', async () => {
      await apiClient
        .delete(`/api/search/saved/${savedSearchId}`)
        .expect(204)

      // Verify it's deleted
      await apiClient
        .get(`/api/search/saved/${savedSearchId}`)
        .expect(404)
    })

    it('should prevent duplicate search names', async () => {
      // Create first search
      await apiClient
        .post('/api/search/save')
        .send({
          name: 'Unique Search Name',
          filters: { city: 'Accra' }
        })
        .expect(201)

      // Try to create with same name
      await apiClient
        .post('/api/search/save')
        .send({
          name: 'Unique Search Name',
          filters: { city: 'Kumasi' }
        })
        .expect(409) // Conflict
    })
  })

  describe('Search Performance', () => {
    beforeEach(async () => {
      // Create many test tailors for performance testing
      const largeTailorSet = Array.from({ length: 100 }, (_, i) => ({
        user_id: `${testUserId}-perf-${i}`,
        business_name: `Performance Test Tailor ${i}`,
        city: i % 3 === 0 ? 'Accra' : i % 3 === 1 ? 'Kumasi' : 'Tema',
        region: i % 3 === 0 ? 'Greater Accra' : i % 3 === 1 ? 'Ashanti' : 'Greater Accra',
        occasions: i % 2 === 0 ? ['Wedding'] : ['Church Service'],
        style_categories: i % 2 === 0 ? ['traditional'] : ['contemporary'],
        fabric_specialties: ['Cotton', 'Ankara'],
        languages_spoken: ['EN'],
        size_ranges: ['regular'],
        rating: 3 + (i % 3),
        starting_price: 100 + (i * 10),
        verification_status: 'verified',
        is_active: true
      }))

      const { data: inserted } = await supabase
        .from('tailor_profiles')
        .insert(largeTailorSet)
        .select('id')

      testTailorIds.push(...inserted!.map(t => t.id))
    })

    it('should handle complex filters efficiently', async () => {
      const startTime = Date.now()

      const response = await apiClient
        .get('/api/tailors/search')
        .query({
          city: 'Accra',
          occasions: 'Wedding,Church Service',
          styleCategories: 'traditional,contemporary',
          fabricPreferences: 'Cotton,Ankara',
          minRating: 3.5,
          maxPrice: 500,
          limit: 20
        })
        .expect(200)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(responseTime).toBeLessThan(500) // Should respond in < 500ms
      expect(response.body.items).toBeInstanceOf(Array)
      expect(response.body.items.length).toBeLessThanOrEqual(20)
    })

    it('should paginate large result sets', async () => {
      // First page
      const page1 = await apiClient
        .get('/api/tailors/search')
        .query({
          city: 'Accra',
          limit: 10,
          offset: 0
        })
        .expect(200)

      expect(page1.body.items).toHaveLength(10)
      expect(page1.body.hasMore).toBe(true)

      // Second page
      const page2 = await apiClient
        .get('/api/tailors/search')
        .query({
          city: 'Accra',
          limit: 10,
          offset: 10
        })
        .expect(200)

      expect(page2.body.items).toHaveLength(10)

      // Ensure no duplicate items between pages
      const page1Ids = page1.body.items.map((t: any) => t.id)
      const page2Ids = page2.body.items.map((t: any) => t.id)
      const intersection = page1Ids.filter((id: string) => page2Ids.includes(id))
      expect(intersection).toHaveLength(0)
    })

    it('should handle concurrent search requests', async () => {
      const searches = [
        { city: 'Accra', occasions: 'Wedding' },
        { city: 'Kumasi', styleCategories: 'traditional' },
        { city: 'Tema', minRating: 4.0 },
        { languages: 'TWI,GA', sizeRanges: 'regular' },
        { fabricPreferences: 'Kente,Ankara', maxPrice: 300 }
      ]

      const startTime = Date.now()

      // Execute all searches concurrently
      const results = await Promise.all(
        searches.map(filters =>
          apiClient
            .get('/api/tailors/search')
            .query(filters)
        )
      )

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All requests should complete
      expect(results.every(r => r.status === 200)).toBe(true)

      // Concurrent requests should complete efficiently
      expect(totalTime).toBeLessThan(1000) // All 5 requests in < 1s
    })
  })

  describe('Search Alert Notifications', () => {
    let alertSearchId: string

    beforeEach(async () => {
      // Create a saved search with alerts enabled
      const response = await apiClient
        .post('/api/search/save')
        .send({
          name: 'Alert Test Search',
          filters: {
            city: 'Accra',
            occasions: ['Wedding']
          },
          alertEnabled: true,
          alertFrequency: 'instant'
        })
        .expect(201)

      alertSearchId = response.body.id
    })

    afterEach(async () => {
      if (alertSearchId) {
        await apiClient
          .delete(`/api/search/saved/${alertSearchId}`)
      }
    })

    it('should track new matches since last check', async () => {
      // Check initial state
      const initialCheck = await apiClient
        .get(`/api/search/saved/${alertSearchId}/check`)
        .expect(200)

      const initialCount = initialCheck.body.newMatchCount

      // Add a new matching tailor
      const newTailor = {
        user_id: `${testUserId}-alert-test`,
        business_name: 'Alert Test Tailor',
        city: 'Accra',
        occasions: ['Wedding'],
        verification_status: 'verified',
        is_active: true
      }

      const { data: inserted } = await supabase
        .from('tailor_profiles')
        .insert(newTailor)
        .select('id')
        .single()

      testTailorIds.push(inserted.id)

      // Check again for new matches
      const newCheck = await apiClient
        .get(`/api/search/saved/${alertSearchId}/check`)
        .expect(200)

      expect(newCheck.body.newMatchCount).toBe(initialCount + 1)
    })

    it('should update last notification timestamp', async () => {
      // Get initial saved search
      const searches = await apiClient
        .get('/api/search/saved')
        .expect(200)

      const initialSearch = searches.body.find((s: any) => s.id === alertSearchId)
      const initialLastNotified = initialSearch.last_notified_at

      // Trigger a check (simulates notification)
      await apiClient
        .get(`/api/search/saved/${alertSearchId}/check`)
        .expect(200)

      // Wait a moment for async update
      await new Promise(resolve => setTimeout(resolve, 100))

      // Get updated saved search
      const updatedSearches = await apiClient
        .get('/api/search/saved')
        .expect(200)

      const updatedSearch = updatedSearches.body.find((s: any) => s.id === alertSearchId)

      // Last notified should be updated
      if (initialLastNotified) {
        expect(new Date(updatedSearch.last_notified_at).getTime())
          .toBeGreaterThan(new Date(initialLastNotified).getTime())
      } else {
        expect(updatedSearch.last_notified_at).toBeTruthy()
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid filter values', async () => {
      await apiClient
        .get('/api/tailors/search')
        .query({
          minRating: 'invalid' // Should be number
        })
        .expect(400)

      await apiClient
        .get('/api/tailors/search')
        .query({
          minRating: 6 // Should be <= 5
        })
        .expect(400)
    })

    it('should handle non-existent saved search', async () => {
      await apiClient
        .get('/api/search/saved/non-existent-id')
        .expect(404)

      await apiClient
        .put('/api/search/saved/non-existent-id')
        .send({ name: 'New Name' })
        .expect(404)

      await apiClient
        .delete('/api/search/saved/non-existent-id')
        .expect(404)
    })

    it('should require authentication for saved searches', async () => {
      // Create unauthenticated client
      const unauthClient = request(TEST_API_URL)

      await unauthClient
        .post('/api/search/save')
        .send({
          name: 'Unauthorized Search',
          filters: {}
        })
        .expect(401)

      await unauthClient
        .get('/api/search/saved')
        .expect(401)
    })

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // In a real scenario, you might temporarily disconnect the database
      // For now, we'll simulate with an invalid query

      await apiClient
        .get('/api/tailors/search')
        .query({
          // Send a malformed filter that might cause a database error
          'filters[$injected]': 'malicious'
        })
        .expect(400) // Should sanitize and reject, not crash
    })
  })
})