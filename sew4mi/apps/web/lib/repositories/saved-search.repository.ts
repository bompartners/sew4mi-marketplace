import { getSupabaseClient } from '../supabase';
import {
  SavedSearch,
  SavedSearchInput,
  SavedSearchUpdate,
  SavedSearchMatch,
  TailorSearchFilters,
} from '@sew4mi/shared';

/**
 * Repository for managing saved searches and search alerts
 * Story 4.4: Advanced Search and Filtering
 */
export class SavedSearchRepository {
  /**
   * Save a new search with optional alerts
   * @param customerId - The ID of the customer saving the search
   * @param input - The saved search input data
   * @returns Promise resolving to the created saved search
   * @throws Error if save fails or name already exists
   */
  async saveSearch(customerId: string, input: SavedSearchInput): Promise<SavedSearch> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        customer_id: customerId,
        name: input.name,
        filters: input.filters,
        alert_enabled: input.alertEnabled ?? false,
        alert_frequency: input.alertFrequency ?? 'weekly',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A saved search with this name already exists');
      }
      throw new Error(`Failed to save search: ${error.message}`);
    }

    return this.mapDatabaseToSavedSearch(data);
  }

  /**
   * Get all saved searches for a customer
   * @param customerId - The ID of the customer
   * @returns Promise resolving to array of saved searches
   */
  async getSavedSearches(customerId: string): Promise<SavedSearch[]> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch saved searches: ${error.message}`);
    }

    return data.map(item => this.mapDatabaseToSavedSearch(item));
  }

  /**
   * Get a single saved search by ID
   * @param savedSearchId - The ID of the saved search
   * @param customerId - The ID of the customer (for authorization)
   * @returns Promise resolving to the saved search or null if not found
   */
  async getSavedSearchById(
    savedSearchId: string,
    customerId: string
  ): Promise<SavedSearch | null> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', savedSearchId)
      .eq('customer_id', customerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      throw new Error(`Failed to fetch saved search: ${error.message}`);
    }

    return this.mapDatabaseToSavedSearch(data);
  }

  /**
   * Update an existing saved search
   * @param savedSearchId - The ID of the saved search to update
   * @param customerId - The ID of the customer (for authorization)
   * @param update - The fields to update
   * @returns Promise resolving to the updated saved search
   * @throws Error if update fails or search not found
   */
  async updateSavedSearch(
    savedSearchId: string,
    customerId: string,
    update: SavedSearchUpdate
  ): Promise<SavedSearch> {
    const supabase = await getSupabaseClient();

    // Build update object with snake_case field names
    const updateData: any = {};
    if (update.name !== undefined) updateData.name = update.name;
    if (update.filters !== undefined) updateData.filters = update.filters;
    if (update.alertEnabled !== undefined) updateData.alert_enabled = update.alertEnabled;
    if (update.alertFrequency !== undefined) updateData.alert_frequency = update.alertFrequency;

    const { data, error } = await supabase
      .from('saved_searches')
      .update(updateData)
      .eq('id', savedSearchId)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        throw new Error('Saved search not found or you do not have permission to update it');
      }
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A saved search with this name already exists');
      }
      throw new Error(`Failed to update saved search: ${error.message}`);
    }

    return this.mapDatabaseToSavedSearch(data);
  }

  /**
   * Delete a saved search
   * @param savedSearchId - The ID of the saved search to delete
   * @param customerId - The ID of the customer (for authorization)
   * @returns Promise resolving to true if deleted, false if not found
   * @throws Error if deletion fails
   */
  async deleteSavedSearch(
    savedSearchId: string,
    customerId: string
  ): Promise<boolean> {
    const supabase = await getSupabaseClient();

    const { error, count } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', savedSearchId)
      .eq('customer_id', customerId);

    if (error) {
      throw new Error(`Failed to delete saved search: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  /**
   * Check for new tailors matching a saved search since last notification
   * @param savedSearchId - The ID of the saved search
   * @param since - Optional timestamp to check from (defaults to last_notified_at)
   * @returns Promise resolving to array of matching tailors
   */
  async checkSavedSearchMatches(
    savedSearchId: string,
    since?: Date
  ): Promise<SavedSearchMatch[]> {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase.rpc('check_saved_search_matches', {
      p_saved_search_id: savedSearchId,
      p_since: since?.toISOString() || null,
    });

    if (error) {
      throw new Error(`Failed to check saved search matches: ${error.message}`);
    }

    return data.map((match: any) => ({
      tailorId: match.tailor_id,
      businessName: match.business_name,
      matchedAt: match.matched_at,
    }));
  }

  /**
   * Get all saved searches with alerts enabled for processing
   * @param frequency - The alert frequency to filter by (instant, daily, weekly)
   * @returns Promise resolving to array of saved searches
   */
  async getSavedSearchesWithAlerts(
    frequency: 'instant' | 'daily' | 'weekly'
  ): Promise<SavedSearch[]> {
    const supabase = await getSupabaseClient();

    // Calculate time threshold based on frequency
    let timeThreshold: Date;
    const now = new Date();

    switch (frequency) {
      case 'instant':
        timeThreshold = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago
        break;
      case 'daily':
        timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        break;
      case 'weekly':
        timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        break;
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('alert_enabled', true)
      .eq('alert_frequency', frequency)
      .or(`last_notified_at.is.null,last_notified_at.lt.${timeThreshold.toISOString()}`);

    if (error) {
      throw new Error(`Failed to fetch saved searches with alerts: ${error.message}`);
    }

    return data.map(item => this.mapDatabaseToSavedSearch(item));
  }

  /**
   * Update the last notified timestamp for a saved search
   * @param savedSearchId - The ID of the saved search
   * @returns Promise resolving when update is complete
   */
  async updateLastNotified(savedSearchId: string): Promise<void> {
    const supabase = await getSupabaseClient();

    const { error } = await supabase
      .from('saved_searches')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('id', savedSearchId);

    if (error) {
      throw new Error(`Failed to update last notified timestamp: ${error.message}`);
    }
  }

  /**
   * Get count of saved searches for a customer
   * @param customerId - The ID of the customer
   * @returns Promise resolving to the count
   */
  async getCount(customerId: string): Promise<number> {
    const supabase = await getSupabaseClient();

    const { count, error } = await supabase
      .from('saved_searches')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    if (error) {
      throw new Error(`Failed to get saved searches count: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Map database record to SavedSearch type
   * @private
   */
  private mapDatabaseToSavedSearch(data: any): SavedSearch {
    return {
      id: data.id,
      customerId: data.customer_id,
      name: data.name,
      filters: data.filters as TailorSearchFilters,
      alertEnabled: data.alert_enabled,
      alertFrequency: data.alert_frequency,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastNotifiedAt: data.last_notified_at,
    };
  }
}
