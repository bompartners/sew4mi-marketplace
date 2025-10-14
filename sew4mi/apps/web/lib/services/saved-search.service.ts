import {
  SavedSearch,
  SavedSearchInput,
  SavedSearchUpdate,
  SavedSearchMatch,
  SAVED_SEARCH_CONFIG,
} from '@sew4mi/shared';
import { SavedSearchRepository } from '../repositories/saved-search.repository';
import { notificationService } from './notification.service';

/**
 * Service for managing saved searches and search alerts
 * Story 4.4: Advanced Search and Filtering
 */
export class SavedSearchService {
  private savedSearchRepository: SavedSearchRepository;

  constructor() {
    this.savedSearchRepository = new SavedSearchRepository();
  }

  /**
   * Save a new search with optional alerts
   * Validates user hasn't exceeded max saved searches limit
   */
  async saveSearch(customerId: string, input: SavedSearchInput): Promise<SavedSearch> {
    try {
      // Check if user has reached maximum saved searches
      const currentCount = await this.savedSearchRepository.getCount(customerId);
      if (currentCount >= SAVED_SEARCH_CONFIG.MAX_SAVED_SEARCHES_PER_USER) {
        throw new Error(
          `You have reached the maximum of ${SAVED_SEARCH_CONFIG.MAX_SAVED_SEARCHES_PER_USER} saved searches`
        );
      }

      // Create the saved search
      const savedSearch = await this.savedSearchRepository.saveSearch(customerId, input);

      return savedSearch;
    } catch (error) {
      console.error('Failed to save search:', error);
      throw error;
    }
  }

  /**
   * Get all saved searches for a customer
   */
  async getSavedSearches(customerId: string): Promise<SavedSearch[]> {
    try {
      return await this.savedSearchRepository.getSavedSearches(customerId);
    } catch (error) {
      console.error('Failed to get saved searches:', error);
      throw error;
    }
  }

  /**
   * Get a single saved search by ID
   */
  async getSavedSearchById(
    savedSearchId: string,
    customerId: string
  ): Promise<SavedSearch | null> {
    try {
      return await this.savedSearchRepository.getSavedSearchById(savedSearchId, customerId);
    } catch (error) {
      console.error('Failed to get saved search:', error);
      throw error;
    }
  }

  /**
   * Update an existing saved search
   */
  async updateSavedSearch(
    savedSearchId: string,
    customerId: string,
    update: SavedSearchUpdate
  ): Promise<SavedSearch> {
    try {
      return await this.savedSearchRepository.updateSavedSearch(
        savedSearchId,
        customerId,
        update
      );
    } catch (error) {
      console.error('Failed to update saved search:', error);
      throw error;
    }
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(savedSearchId: string, customerId: string): Promise<boolean> {
    try {
      return await this.savedSearchRepository.deleteSavedSearch(savedSearchId, customerId);
    } catch (error) {
      console.error('Failed to delete saved search:', error);
      throw error;
    }
  }

  /**
   * Check for new tailors matching a saved search
   * @param savedSearchId - ID of the saved search
   * @param since - Optional timestamp to check from
   * @returns Array of matching tailors and their metadata
   */
  async checkSavedSearchMatches(
    savedSearchId: string,
    since?: Date
  ): Promise<SavedSearchMatch[]> {
    try {
      return await this.savedSearchRepository.checkSavedSearchMatches(savedSearchId, since);
    } catch (error) {
      console.error('Failed to check saved search matches:', error);
      throw error;
    }
  }

  /**
   * Process search alerts for a specific frequency
   * This is called by the background job (pg_cron functions)
   * @param frequency - The alert frequency to process (instant, daily, weekly)
   * @returns Number of notifications sent
   */
  async processSearchAlerts(
    frequency: 'instant' | 'daily' | 'weekly'
  ): Promise<number> {
    try {
      // Get all saved searches with alerts enabled for this frequency
      const savedSearches = await this.savedSearchRepository.getSavedSearchesWithAlerts(
        frequency
      );

      let notificationsSent = 0;

      // Process each saved search
      for (const savedSearch of savedSearches) {
        try {
          // Check for new matches
          const matches = await this.savedSearchRepository.checkSavedSearchMatches(
            savedSearch.id
          );

          // If there are new matches, send notification
          if (matches.length > 0) {
            await this.sendSearchAlertNotification(savedSearch, matches);

            // Update last notified timestamp
            await this.savedSearchRepository.updateLastNotified(savedSearch.id);

            notificationsSent++;
          }
        } catch (error) {
          console.error(
            `Failed to process alert for saved search ${savedSearch.id}:`,
            error
          );
          // Continue processing other searches even if one fails
        }
      }

      return notificationsSent;
    } catch (error) {
      console.error('Failed to process search alerts:', error);
      throw error;
    }
  }

  /**
   * Send notification to customer about new tailor matches
   * @private
   */
  private async sendSearchAlertNotification(
    savedSearch: SavedSearch,
    matches: SavedSearchMatch[]
  ): Promise<void> {
    try {
      const matchCount = matches.length;
      const tailorNames = matches
        .slice(0, 3)
        .map(m => m.businessName)
        .join(', ');

      const additionalText = matchCount > 3 ? ` and ${matchCount - 3} more` : '';

      // Compose notification message
      const message = `🔔 New matches for "${savedSearch.name}"!\n\n` +
        `We found ${matchCount} new tailor${matchCount > 1 ? 's' : ''} matching your saved search:\n` +
        `${tailorNames}${additionalText}\n\n` +
        `Visit Sew4Mi to view all matches and connect with tailors.`;

      // Send notification through notification service
      // The notification service handles WhatsApp, SMS, and push notifications
      await notificationService.sendCustomNotification(
        savedSearch.customerId,
        'New Tailor Matches',
        message,
        {
          type: 'SAVED_SEARCH_ALERT',
          savedSearchId: savedSearch.id,
          matchCount,
        }
      );
    } catch (error) {
      console.error('Failed to send search alert notification:', error);
      // Don't throw - we want to continue processing other searches
    }
  }

  /**
   * Test a saved search to see how many tailors it would match
   * Useful for users to preview search results before saving
   */
  async testSearch(filters: SavedSearchInput['filters']): Promise<number> {
    try {
      // Use the tailor search repository to test the filters
      // This would require access to TailorSearchRepository
      // For now, return a placeholder
      // TODO: Implement with actual search
      return 0;
    } catch (error) {
      console.error('Failed to test search:', error);
      throw error;
    }
  }

  /**
   * Get saved search statistics for a customer
   */
  async getStats(customerId: string): Promise<{
    total: number;
    withAlertsEnabled: number;
    byFrequency: { instant: number; daily: number; weekly: number };
  }> {
    try {
      const savedSearches = await this.savedSearchRepository.getSavedSearches(customerId);

      const stats = {
        total: savedSearches.length,
        withAlertsEnabled: savedSearches.filter(s => s.alertEnabled).length,
        byFrequency: {
          instant: savedSearches.filter(s => s.alertFrequency === 'instant' && s.alertEnabled).length,
          daily: savedSearches.filter(s => s.alertFrequency === 'daily' && s.alertEnabled).length,
          weekly: savedSearches.filter(s => s.alertFrequency === 'weekly' && s.alertEnabled).length,
        },
      };

      return stats;
    } catch (error) {
      console.error('Failed to get saved search stats:', error);
      throw error;
    }
  }
}

export const savedSearchService = new SavedSearchService();
