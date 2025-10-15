/**
 * Unit tests for SavedSearchService
 * Tests business logic and notification management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SavedSearchService } from '@/lib/services/saved-search.service'
import { SavedSearchRepository } from '@/lib/repositories/saved-search.repository'
import { NotificationService } from '@/lib/services/notification.service'
import { TailorSearchService } from '@/lib/services/tailor-search.service'
import type { SavedSearch, SavedSearchInput } from '@sew4mi/shared/types'

// Mock dependencies
vi.mock('@/lib/repositories/saved-search.repository')
vi.mock('@/lib/services/notification.service')
vi.mock('@/lib/services/tailor-search.service')

describe('SavedSearchService', () => {
  let service: SavedSearchService
  let mockRepository: vi.Mocked<SavedSearchRepository>
  let mockNotificationService: vi.Mocked<NotificationService>
  let mockTailorSearchService: vi.Mocked<TailorSearchService>

  beforeEach(() => {
    // Create mock instances
    mockRepository = new SavedSearchRepository() as vi.Mocked<SavedSearchRepository>
    mockNotificationService = new NotificationService() as vi.Mocked<NotificationService>
    mockTailorSearchService = new TailorSearchService() as vi.Mocked<TailorSearchService>

    // Initialize service with mocked dependencies
    service = new SavedSearchService(
      mockRepository,
      mockNotificationService,
      mockTailorSearchService
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('saveSearch', () => {
    it('should save a search with validation', async () => {
      const input: SavedSearchInput = {
        name: 'My Wedding Tailors',
        filters: {
          city: 'Accra',
          occasions: ['Wedding'],
          minRating: 4.0
        },
        alertEnabled: true,
        alertFrequency: 'daily'
      }

      const expectedSavedSearch: SavedSearch = {
        id: 'search-123',
        customerId: 'customer-123',
        ...input,
        createdAt: new Date(),
        lastNotifiedAt: null
      }

      mockRepository.saveSearch.mockResolvedValue(expectedSavedSearch)

      const result = await service.saveSearch(input)

      expect(mockRepository.saveSearch).toHaveBeenCalledWith(input)
      expect(result).toEqual(expectedSavedSearch)
    })

    it('should validate search name length', async () => {
      const input: SavedSearchInput = {
        name: 'A'.repeat(101), // Too long
        filters: {}
      }

      await expect(service.saveSearch(input)).rejects.toThrow('Search name must be between 1 and 100 characters')
    })

    it('should validate alert frequency values', async () => {
      const input: SavedSearchInput = {
        name: 'Valid Name',
        filters: {},
        alertFrequency: 'invalid' as any
      }

      await expect(service.saveSearch(input)).rejects.toThrow('Invalid alert frequency')
    })

    it('should handle duplicate name errors', async () => {
      const input: SavedSearchInput = {
        name: 'Existing Search',
        filters: {}
      }

      mockRepository.saveSearch.mockRejectedValue(
        new Error('Duplicate key value violates unique constraint')
      )

      await expect(service.saveSearch(input)).rejects.toThrow(
        'A saved search with this name already exists'
      )
    })
  })

  describe('getSavedSearches', () => {
    it('should retrieve and enrich saved searches', async () => {
      const mockSearches: SavedSearch[] = [
        {
          id: 'search-1',
          customerId: 'customer-123',
          name: 'Wedding Tailors',
          filters: { occasions: ['Wedding'] },
          alertEnabled: true,
          alertFrequency: 'daily',
          createdAt: new Date('2024-01-01'),
          lastNotifiedAt: null
        },
        {
          id: 'search-2',
          customerId: 'customer-123',
          name: 'Local Tailors',
          filters: { city: 'Accra' },
          alertEnabled: false,
          alertFrequency: 'weekly',
          createdAt: new Date('2024-01-02'),
          lastNotifiedAt: new Date('2024-01-03')
        }
      ]

      mockRepository.getSavedSearches.mockResolvedValue(mockSearches)

      // Mock match counts for each search
      mockTailorSearchService.searchTailors.mockImplementation(async (filters) => ({
        items: [],
        total: filters.occasions ? 5 : 3,
        hasMore: false
      }))

      const result = await service.getSavedSearches()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        ...mockSearches[0],
        matchCount: 5
      })
      expect(result[1]).toMatchObject({
        ...mockSearches[1],
        matchCount: 3
      })
    })

    it('should handle empty search list', async () => {
      mockRepository.getSavedSearches.mockResolvedValue([])

      const result = await service.getSavedSearches()

      expect(result).toEqual([])
      expect(mockTailorSearchService.searchTailors).not.toHaveBeenCalled()
    })
  })

  describe('updateSavedSearch', () => {
    it('should update search with validation', async () => {
      const searchId = 'search-123'
      const updates: Partial<SavedSearchInput> = {
        name: 'Updated Name',
        alertEnabled: false
      }

      const updatedSearch: SavedSearch = {
        id: searchId,
        customerId: 'customer-123',
        name: 'Updated Name',
        filters: { city: 'Accra' },
        alertEnabled: false,
        alertFrequency: 'daily',
        createdAt: new Date(),
        lastNotifiedAt: null
      }

      mockRepository.updateSavedSearch.mockResolvedValue(updatedSearch)

      const result = await service.updateSavedSearch(searchId, updates)

      expect(mockRepository.updateSavedSearch).toHaveBeenCalledWith(searchId, updates)
      expect(result).toEqual(updatedSearch)
    })

    it('should validate updates before applying', async () => {
      const searchId = 'search-123'
      const updates: Partial<SavedSearchInput> = {
        name: '', // Invalid empty name
      }

      await expect(service.updateSavedSearch(searchId, updates)).rejects.toThrow(
        'Search name cannot be empty'
      )
    })

    it('should handle non-existent search', async () => {
      mockRepository.updateSavedSearch.mockRejectedValue(
        new Error('Search not found')
      )

      await expect(
        service.updateSavedSearch('non-existent', { name: 'New Name' })
      ).rejects.toThrow('Search not found')
    })
  })

  describe('deleteSavedSearch', () => {
    it('should delete a saved search', async () => {
      const searchId = 'search-123'

      mockRepository.deleteSavedSearch.mockResolvedValue(undefined)

      await service.deleteSavedSearch(searchId)

      expect(mockRepository.deleteSavedSearch).toHaveBeenCalledWith(searchId)
    })

    it('should handle deletion errors', async () => {
      mockRepository.deleteSavedSearch.mockRejectedValue(
        new Error('Permission denied')
      )

      await expect(service.deleteSavedSearch('search-123')).rejects.toThrow(
        'Permission denied'
      )
    })
  })

  describe('checkForNewMatches', () => {
    it('should check for new matches and send notification if enabled', async () => {
      const searchId = 'search-123'
      const checkResult = {
        savedSearch: {
          id: searchId,
          customerId: 'customer-123',
          name: 'Wedding Tailors',
          filters: { occasions: ['Wedding'] },
          alertEnabled: true,
          alertFrequency: 'instant' as const,
          createdAt: new Date(),
          lastNotifiedAt: null
        },
        newMatches: [
          { id: 'tailor-1', business_name: 'Elite Tailors' },
          { id: 'tailor-2', business_name: 'Royal Threads' }
        ],
        newMatchCount: 2
      }

      mockRepository.checkSavedSearchMatches.mockResolvedValue(checkResult)
      mockNotificationService.sendSearchAlertNotification.mockResolvedValue(undefined)

      const result = await service.checkForNewMatches(searchId)

      expect(result).toEqual(checkResult)
      expect(mockNotificationService.sendSearchAlertNotification).toHaveBeenCalledWith(
        'customer-123',
        checkResult.savedSearch,
        checkResult.newMatches
      )
    })

    it('should skip notification if alerts are disabled', async () => {
      const searchId = 'search-456'
      const checkResult = {
        savedSearch: {
          id: searchId,
          customerId: 'customer-456',
          name: 'Local Tailors',
          filters: { city: 'Accra' },
          alertEnabled: false, // Alerts disabled
          alertFrequency: 'daily' as const,
          createdAt: new Date(),
          lastNotifiedAt: null
        },
        newMatches: [{ id: 'tailor-3', business_name: 'City Tailors' }],
        newMatchCount: 1
      }

      mockRepository.checkSavedSearchMatches.mockResolvedValue(checkResult)

      const result = await service.checkForNewMatches(searchId)

      expect(result).toEqual(checkResult)
      expect(mockNotificationService.sendSearchAlertNotification).not.toHaveBeenCalled()
    })

    it('should skip notification if no new matches', async () => {
      const searchId = 'search-789'
      const checkResult = {
        savedSearch: {
          id: searchId,
          customerId: 'customer-789',
          name: 'Specific Search',
          filters: { city: 'Tema' },
          alertEnabled: true,
          alertFrequency: 'weekly' as const,
          createdAt: new Date(),
          lastNotifiedAt: new Date()
        },
        newMatches: [],
        newMatchCount: 0
      }

      mockRepository.checkSavedSearchMatches.mockResolvedValue(checkResult)

      const result = await service.checkForNewMatches(searchId)

      expect(result).toEqual(checkResult)
      expect(mockNotificationService.sendSearchAlertNotification).not.toHaveBeenCalled()
    })

    it('should update last notification timestamp after sending', async () => {
      const searchId = 'search-123'
      const checkResult = {
        savedSearch: {
          id: searchId,
          customerId: 'customer-123',
          name: 'Test Search',
          filters: {},
          alertEnabled: true,
          alertFrequency: 'instant' as const,
          createdAt: new Date(),
          lastNotifiedAt: null
        },
        newMatches: [{ id: 'tailor-1', business_name: 'Test Tailor' }],
        newMatchCount: 1
      }

      mockRepository.checkSavedSearchMatches.mockResolvedValue(checkResult)
      mockNotificationService.sendSearchAlertNotification.mockResolvedValue(undefined)
      mockRepository.updateSavedSearch.mockResolvedValue({
        ...checkResult.savedSearch,
        lastNotifiedAt: new Date()
      })

      await service.checkForNewMatches(searchId)

      expect(mockRepository.updateSavedSearch).toHaveBeenCalledWith(
        searchId,
        { lastNotifiedAt: expect.any(Date) }
      )
    })
  })

  describe('processScheduledAlerts', () => {
    it('should process all alerts for a given frequency', async () => {
      const mockSearches: SavedSearch[] = [
        {
          id: 'search-1',
          customerId: 'customer-1',
          name: 'Daily Alert 1',
          filters: {},
          alertEnabled: true,
          alertFrequency: 'daily',
          createdAt: new Date(),
          lastNotifiedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
        },
        {
          id: 'search-2',
          customerId: 'customer-2',
          name: 'Daily Alert 2',
          filters: {},
          alertEnabled: true,
          alertFrequency: 'daily',
          createdAt: new Date(),
          lastNotifiedAt: new Date(Date.now() - 26 * 60 * 60 * 1000) // 26 hours ago
        }
      ]

      mockRepository.getScheduledAlerts.mockResolvedValue(mockSearches)

      for (const search of mockSearches) {
        mockRepository.checkSavedSearchMatches.mockResolvedValueOnce({
          savedSearch: search,
          newMatches: [{ id: `tailor-${search.id}`, business_name: 'Test Tailor' }],
          newMatchCount: 1
        })
      }

      mockNotificationService.sendSearchAlertNotification.mockResolvedValue(undefined)
      mockRepository.updateSavedSearch.mockResolvedValue(mockSearches[0])

      const results = await service.processScheduledAlerts('daily')

      expect(results).toHaveLength(2)
      expect(results[0].status).toBe('notified')
      expect(results[1].status).toBe('notified')
      expect(mockNotificationService.sendSearchAlertNotification).toHaveBeenCalledTimes(2)
    })

    it('should handle errors during batch processing', async () => {
      const mockSearches: SavedSearch[] = [
        {
          id: 'search-error',
          customerId: 'customer-error',
          name: 'Error Search',
          filters: {},
          alertEnabled: true,
          alertFrequency: 'instant',
          createdAt: new Date(),
          lastNotifiedAt: null
        }
      ]

      mockRepository.getScheduledAlerts.mockResolvedValue(mockSearches)
      mockRepository.checkSavedSearchMatches.mockRejectedValue(
        new Error('Database error')
      )

      const results = await service.processScheduledAlerts('instant')

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('error')
      expect(results[0].error).toBe('Database error')
    })

    it('should respect rate limits when processing many alerts', async () => {
      // Create 25 searches to test rate limiting
      const mockSearches = Array.from({ length: 25 }, (_, i) => ({
        id: `search-${i}`,
        customerId: `customer-${i}`,
        name: `Search ${i}`,
        filters: {},
        alertEnabled: true,
        alertFrequency: 'instant' as const,
        createdAt: new Date(),
        lastNotifiedAt: null
      }))

      mockRepository.getScheduledAlerts.mockResolvedValue(mockSearches)

      for (const search of mockSearches) {
        mockRepository.checkSavedSearchMatches.mockResolvedValueOnce({
          savedSearch: search,
          newMatches: [],
          newMatchCount: 0
        })
      }

      const startTime = Date.now()
      const results = await service.processScheduledAlerts('instant')
      const endTime = Date.now()

      expect(results).toHaveLength(25)

      // Should have delays between batches for rate limiting
      // Processing 25 searches in batches of 10 should take at least 2 seconds
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000)
    })
  })

  describe('validateFilters', () => {
    it('should validate filter combinations', () => {
      const validFilters = {
        city: 'Accra',
        occasions: ['Wedding', 'Graduation'],
        styleCategories: ['traditional'],
        minRating: 4.0,
        maxPrice: 1000
      }

      expect(() => service.validateFilters(validFilters)).not.toThrow()
    })

    it('should reject invalid price ranges', () => {
      const invalidFilters = {
        minPrice: 500,
        maxPrice: 100 // Max less than min
      }

      expect(() => service.validateFilters(invalidFilters)).toThrow(
        'Maximum price must be greater than minimum price'
      )
    })

    it('should reject invalid delivery timeframes', () => {
      const invalidFilters = {
        deliveryTimeframeMin: 14,
        deliveryTimeframeMax: 7 // Max less than min
      }

      expect(() => service.validateFilters(invalidFilters)).toThrow(
        'Maximum delivery time must be greater than minimum delivery time'
      )
    })

    it('should validate rating ranges', () => {
      const invalidFilters = {
        minRating: 6.0 // Invalid rating > 5
      }

      expect(() => service.validateFilters(invalidFilters)).toThrow(
        'Rating must be between 0 and 5'
      )
    })
  })
})