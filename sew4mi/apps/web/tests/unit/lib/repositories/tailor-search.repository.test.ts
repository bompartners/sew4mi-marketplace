/**
 * Unit tests for TailorSearchRepository
 * Tests advanced search filters and query performance
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TailorSearchRepository } from '@/lib/repositories/tailor-search.repository'
import { createClient } from '@/lib/supabase/client'
import type { TailorSearchFilters, TailorSearchItem } from '@sew4mi/shared/types'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

describe('TailorSearchRepository', () => {
  let repository: TailorSearchRepository
  let mockSupabase: any

  beforeEach(() => {
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(function() { return this }),
          neq: vi.fn(function() { return this }),
          gte: vi.fn(function() { return this }),
          lte: vi.fn(function() { return this }),
          contains: vi.fn(function() { return this }),
          overlaps: vi.fn(function() { return this }),
          ilike: vi.fn(function() { return this }),
          or: vi.fn(function() { return this }),
          order: vi.fn(function() { return this }),
          range: vi.fn(function() { return this }),
          limit: vi.fn(function() { return this }),
          then: vi.fn((callback) => callback({ data: [], error: null, count: 0 }))
        }))
      })),
      rpc: vi.fn()
    }

    ;(createClient as any).mockReturnValue(mockSupabase)
    repository = new TailorSearchRepository()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('searchTailors', () => {
    it('should handle basic search without filters', async () => {
      const filters: TailorSearchFilters = {}

      const result = await repository.searchTailors(filters)

      expect(result).toBeDefined()
      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
      expect(mockSupabase.from).toHaveBeenCalledWith('tailor_profiles')
    })

    it('should apply occasion filters correctly', async () => {
      const filters: TailorSearchFilters = {
        occasions: ['Wedding', 'Church Service', 'Graduation']
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({
          data: [{ id: '1', business_name: 'Test Tailor', occasions: ['Wedding'] }],
          error: null,
          count: 1
        }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await repository.searchTailors(filters)

      expect(mockQuery.overlaps).toHaveBeenCalledWith('occasions', filters.occasions)
      expect(result.items).toHaveLength(1)
    })

    it('should apply multiple filter combinations', async () => {
      const filters: TailorSearchFilters = {
        city: 'Accra',
        occasions: ['Wedding'],
        styleCategories: ['traditional'],
        fabricPreferences: ['Kente', 'Ankara'],
        sizeRanges: ['regular', 'plus-size'],
        languages: ['EN', 'TWI'],
        deliveryTimeframeMin: 7,
        deliveryTimeframeMax: 14,
        minRating: 4.0,
        minPrice: 100,
        maxPrice: 500
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: [], error: null, count: 0 }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await repository.searchTailors(filters, 0, 20, 'rating')

      // Verify all filters are applied
      expect(mockQuery.eq).toHaveBeenCalledWith('city', 'Accra')
      expect(mockQuery.overlaps).toHaveBeenCalledWith('occasions', filters.occasions)
      expect(mockQuery.overlaps).toHaveBeenCalledWith('style_categories', filters.styleCategories)
      expect(mockQuery.overlaps).toHaveBeenCalledWith('fabric_specialties', filters.fabricPreferences)
      expect(mockQuery.overlaps).toHaveBeenCalledWith('size_ranges', filters.sizeRanges)
      expect(mockQuery.overlaps).toHaveBeenCalledWith('languages_spoken', filters.languages)
      expect(mockQuery.gte).toHaveBeenCalledWith('min_delivery_days', 7)
      expect(mockQuery.lte).toHaveBeenCalledWith('max_delivery_days', 14)
      expect(mockQuery.gte).toHaveBeenCalledWith('rating', 4.0)
      expect(mockQuery.gte).toHaveBeenCalledWith('starting_price', 100)
      expect(mockQuery.lte).toHaveBeenCalledWith('starting_price', 500)
    })

    it('should handle pagination correctly', async () => {
      const filters: TailorSearchFilters = {}
      const offset = 20
      const limit = 10

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: [], error: null, count: 50 }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await repository.searchTailors(filters, offset, limit)

      expect(mockQuery.range).toHaveBeenCalledWith(offset, offset + limit - 1)
      expect(result.hasMore).toBe(true) // 30 < 50
    })

    it('should handle sorting options', async () => {
      const filters: TailorSearchFilters = {}
      const sortOptions = ['rating', 'price', 'responseTime', 'distance']

      for (const sortBy of sortOptions) {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          then: vi.fn((cb) => cb({ data: [], error: null, count: 0 }))
        }

        mockSupabase.from.mockReturnValue(mockQuery)

        await repository.searchTailors(filters, 0, 20, sortBy as any)

        if (sortBy === 'price') {
          expect(mockQuery.order).toHaveBeenCalledWith('starting_price', { ascending: true })
        } else if (sortBy === 'responseTime') {
          expect(mockQuery.order).toHaveBeenCalledWith('average_response_time', { ascending: true })
        } else if (sortBy === 'distance') {
          // Distance sorting might use RPC or calculated field
          expect(mockQuery.order).toHaveBeenCalled()
        } else {
          expect(mockQuery.order).toHaveBeenCalledWith(sortBy, { ascending: false })
        }
      }
    })

    it('should handle search query with text', async () => {
      const filters: TailorSearchFilters = {
        query: 'wedding dress'
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: [], error: null, count: 0 }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await repository.searchTailors(filters)

      // Should search in business name, bio, and specializations
      expect(mockQuery.or).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const filters: TailorSearchFilters = {}
      const mockError = new Error('Database error')

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: null, error: mockError, count: null }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await expect(repository.searchTailors(filters)).rejects.toThrow('Database error')
    })

    describe('Performance Tests', () => {
      it('should handle large result sets efficiently', async () => {
        const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
          id: `tailor-${i}`,
          business_name: `Tailor ${i}`,
          city: i % 2 === 0 ? 'Accra' : 'Kumasi',
          rating: 3 + (i % 3),
          occasions: ['Wedding', 'Church Service']
        }))

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          overlaps: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          then: vi.fn((cb) => cb({
            data: largeDataset.slice(0, 20),
            error: null,
            count: largeDataset.length
          }))
        }

        mockSupabase.from.mockReturnValue(mockQuery)

        const startTime = performance.now()
        const result = await repository.searchTailors({ city: 'Accra' })
        const endTime = performance.now()

        expect(result.items).toHaveLength(20)
        expect(result.total).toBe(1000)
        expect(endTime - startTime).toBeLessThan(200) // Should process in < 200ms
      })

      it('should optimize queries with multiple array filters', async () => {
        const complexFilters: TailorSearchFilters = {
          occasions: ['Wedding', 'Graduation', 'Church Service', 'Corporate Event'],
          styleCategories: ['traditional', 'contemporary', 'fusion'],
          fabricPreferences: ['Kente', 'Ankara', 'Batik', 'Cotton', 'Silk'],
          sizeRanges: ['petite', 'regular', 'plus-size', 'tall'],
          languages: ['EN', 'TWI', 'GA', 'EWE']
        }

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          overlaps: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          then: vi.fn((cb) => cb({ data: [], error: null, count: 0 }))
        }

        mockSupabase.from.mockReturnValue(mockQuery)

        const startTime = performance.now()
        await repository.searchTailors(complexFilters)
        const endTime = performance.now()

        // Verify all overlaps are called
        expect(mockQuery.overlaps).toHaveBeenCalledTimes(5)

        // Query should still be fast even with complex filters
        expect(endTime - startTime).toBeLessThan(100)
      })

      it('should efficiently handle combined text and filter search', async () => {
        const filters: TailorSearchFilters = {
          query: 'traditional kente wedding',
          city: 'Accra',
          occasions: ['Wedding'],
          styleCategories: ['traditional'],
          minRating: 4.5
        }

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          overlaps: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          then: vi.fn((cb) => cb({
            data: [
              { id: '1', business_name: 'Kente Masters', rating: 4.8 },
              { id: '2', business_name: 'Traditional Threads', rating: 4.6 }
            ],
            error: null,
            count: 2
          }))
        }

        mockSupabase.from.mockReturnValue(mockQuery)

        const result = await repository.searchTailors(filters)

        expect(result.items).toHaveLength(2)
        expect(mockQuery.or).toHaveBeenCalled() // Text search
        expect(mockQuery.eq).toHaveBeenCalled() // City filter
        expect(mockQuery.overlaps).toHaveBeenCalled() // Array filters
        expect(mockQuery.gte).toHaveBeenCalled() // Rating filter
      })
    })
  })

  describe('getTailorById', () => {
    it('should fetch a single tailor by ID', async () => {
      const tailorId = 'tailor-123'
      const mockTailor = {
        id: tailorId,
        business_name: 'Elite Tailors',
        city: 'Accra'
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: mockTailor, error: null }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await repository.getTailorById(tailorId)

      expect(mockQuery.eq).toHaveBeenCalledWith('id', tailorId)
      expect(mockQuery.single).toHaveBeenCalled()
      expect(result).toEqual(mockTailor)
    })

    it('should handle non-existent tailor', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: null, error: null }))
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await repository.getTailorById('non-existent')

      expect(result).toBeNull()
    })
  })
})