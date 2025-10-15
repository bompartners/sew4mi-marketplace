/**
 * Unit tests for SavedSearchRepository
 * Tests CRUD operations and alert checking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SavedSearchRepository } from '@/lib/repositories/saved-search.repository'
import type { SavedSearch, SavedSearchInput } from '@sew4mi/shared/types'

describe('SavedSearchRepository', () => {
  let repository: SavedSearchRepository
  let mockSupabase: any
  const mockCustomerId = 'user-123'

  beforeEach(() => {
    // Setup mock query builder that will be returned by from()
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
      rpc: vi.fn(),
    }

    // Inject mock client into repository
    repository = new SavedSearchRepository(mockSupabase as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('saveSearch', () => {
    it('should save a new search with default settings', async () => {
      const searchInput: SavedSearchInput = {
        name: 'My Wedding Tailors',
        filters: {
          city: 'Accra',
          occasions: ['Wedding'],
          minRating: 4.0
        }
      }

      const mockDbRecord = {
        id: 'search-123',
        customer_id: mockCustomerId,
        name: searchInput.name,
        filters: searchInput.filters,
        alert_enabled: false,
        alert_frequency: 'weekly',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_notified_at: null
      }

      // Get the query builder from the from() call
      const mockQueryBuilder = mockSupabase.from()
      mockQueryBuilder.single.mockResolvedValue({ data: mockDbRecord, error: null })

      const result = await repository.saveSearch(mockCustomerId, searchInput)

      expect(mockSupabase.from).toHaveBeenCalledWith('saved_searches')
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        customer_id: mockCustomerId,
        name: searchInput.name,
        filters: searchInput.filters,
        alert_enabled: searchInput.alertEnabled ?? false,
        alert_frequency: searchInput.alertFrequency ?? 'weekly'
      })
      expect(result.id).toBe('search-123')
      expect(result.customerId).toBe(mockCustomerId)
    })

    it('should save search with custom alert settings', async () => {
      const searchInput: SavedSearchInput = {
        name: 'Urgent Tailors',
        filters: { city: 'Kumasi' },
        alertEnabled: true,
        alertFrequency: 'instant'
      }

      const mockDbRecord = {
        id: 'search-456',
        customer_id: mockCustomerId,
        name: searchInput.name,
        filters: searchInput.filters,
        alert_enabled: true,
        alert_frequency: 'instant',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_notified_at: null
      }

      const mockQueryBuilder = mockSupabase.from()
      mockQueryBuilder.single.mockResolvedValue({ data: mockDbRecord, error: null })

      await repository.saveSearch(mockCustomerId, searchInput)

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alert_enabled: true,
          alert_frequency: 'instant'
        })
      )
    })

    it('should handle duplicate search names', async () => {
      const searchInput: SavedSearchInput = {
        name: 'Existing Search',
        filters: {}
      }

      const mockError = { code: '23505', message: 'duplicate key value violates unique constraint' }
      const mockQueryBuilder = mockSupabase.from()
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: mockError })

      await expect(repository.saveSearch(mockCustomerId, searchInput)).rejects.toThrow('A saved search with this name already exists')
    })
  })

  describe('getSavedSearches', () => {
    it('should retrieve all saved searches for a user', async () => {
      const mockDbRecords = [
        {
          id: 'search-1',
          customer_id: mockCustomerId,
          name: 'Wedding Tailors',
          filters: { occasions: ['Wedding'] },
          alert_enabled: true,
          alert_frequency: 'daily',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_notified_at: null
        },
        {
          id: 'search-2',
          customer_id: mockCustomerId,
          name: 'Local Tailors',
          filters: { city: 'Accra' },
          alert_enabled: false,
          alert_frequency: 'weekly',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          last_notified_at: '2024-01-03T00:00:00Z'
        }
      ]

      const mockQueryBuilder = mockSupabase.from()
      mockQueryBuilder.order.mockResolvedValue({ data: mockDbRecords, error: null })

      const result = await repository.getSavedSearches(mockCustomerId)

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('customer_id', mockCustomerId)
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toHaveLength(2)
      expect(result[0].customerId).toBe(mockCustomerId)
    })

    it('should return empty array when user has no saved searches', async () => {
      const mockQueryBuilder = mockSupabase.from()
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null })

      const result = await repository.getSavedSearches(mockCustomerId)

      expect(result).toEqual([])
    })
  })

  describe('updateSavedSearch', () => {
    it('should update an existing saved search', async () => {
      const searchId = 'search-123'
      const updates: Partial<SavedSearchInput> = {
        name: 'Updated Name',
        alertEnabled: false,
        alertFrequency: 'weekly'
      }

      const mockDbRecord = {
        id: searchId,
        customer_id: mockCustomerId,
        name: 'Updated Name',
        filters: { city: 'Accra' },
        alert_enabled: false,
        alert_frequency: 'weekly',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
        last_notified_at: null
      }

      const mockQueryBuilder = mockSupabase.from()
      mockQueryBuilder.single.mockResolvedValue({ data: mockDbRecord, error: null })

      const result = await repository.updateSavedSearch(searchId, mockCustomerId, updates)

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        name: updates.name,
        alert_enabled: updates.alertEnabled,
        alert_frequency: updates.alertFrequency
      })
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', searchId)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('customer_id', mockCustomerId)
      expect(result.name).toBe('Updated Name')
    })

    it('should handle non-existent search update', async () => {
      const mockQueryBuilder = mockSupabase.from()
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } })

      await expect(
        repository.updateSavedSearch('non-existent', mockCustomerId, { name: 'New Name' })
      ).rejects.toThrow('Saved search not found')
    })
  })

  describe('deleteSavedSearch', () => {
    it('should delete a saved search', async () => {
      const searchId = 'search-123'

      const mockQueryBuilder = mockSupabase.from()
      // First eq() returns this for chaining, second eq() returns the final result
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)  // First call: eq('id', searchId)
        .mockReturnValueOnce({ error: null, count: 1 })  // Second call: eq('customer_id', customerId)

      const result = await repository.deleteSavedSearch(searchId, mockCustomerId)

      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', searchId)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('customer_id', mockCustomerId)
      expect(result).toBe(true)
    })

    it('should handle delete errors', async () => {
      const mockQueryBuilder = mockSupabase.from()
      mockQueryBuilder.eq
        .mockReturnValueOnce(mockQueryBuilder)  // First call: eq('id', searchId)
        .mockReturnValueOnce({ error: { message: 'Delete failed' }, count: null })  // Second call with error

      await expect(repository.deleteSavedSearch('search-123', mockCustomerId)).rejects.toThrow('Delete failed')
    })
  })

  describe('checkSavedSearchMatches', () => {
    it('should check for new matches since last notification', async () => {
      const searchId = 'search-123'
      const mockMatches = [
        { tailor_id: 'tailor-1', business_name: 'Elite Wedding Tailors', matched_at: '2024-01-03T00:00:00Z' },
        { tailor_id: 'tailor-2', business_name: 'Royal Threads', matched_at: '2024-01-03T01:00:00Z' }
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockMatches, error: null })

      const result = await repository.checkSavedSearchMatches(searchId)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_saved_search_matches', {
        p_saved_search_id: searchId,
        p_since: null
      })
      expect(result).toHaveLength(2)
      expect(result[0].tailorId).toBe('tailor-1')
      expect(result[0].businessName).toBe('Elite Wedding Tailors')
    })

    it('should handle search with no matches', async () => {
      const searchId = 'search-456'

      mockSupabase.rpc.mockResolvedValue({ data: [], error: null })

      const result = await repository.checkSavedSearchMatches(searchId)

      expect(result).toHaveLength(0)
    })

    it('should pass since parameter when provided', async () => {
      const searchId = 'search-789'
      const sinceDate = new Date('2024-01-01T00:00:00Z')

      mockSupabase.rpc.mockResolvedValue({ data: [], error: null })

      await repository.checkSavedSearchMatches(searchId, sinceDate)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_saved_search_matches', {
        p_saved_search_id: searchId,
        p_since: sinceDate.toISOString()
      })
    })
  })
})