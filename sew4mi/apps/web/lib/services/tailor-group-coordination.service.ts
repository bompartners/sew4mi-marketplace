/**
 * Tailor Group Coordination Service
 * Business logic for tailor group order coordination operations
 */

import { TailorGroupOrderRepository } from '@/lib/repositories/tailor-group-order.repository';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  EnhancedGroupOrder,
  TailorGroupCoordination,
  DesignSuggestion,
  DesignSuggestionSubmission
} from '@sew4mi/shared/types/group-order';

export class TailorGroupCoordinationService {
  private repository: TailorGroupOrderRepository;

  constructor(private supabase: SupabaseClient) {
    this.repository = new TailorGroupOrderRepository(supabase);
  }

  /**
   * Get all group orders assigned to tailor with filters
   */
  async getAssignedGroupOrders(
    tailorId: string,
    filters?: {
      status?: string;
      eventType?: string;
    }
  ): Promise<EnhancedGroupOrder[]> {
    return this.repository.getAssignedGroupOrders(tailorId, filters);
  }

  /**
   * Get detailed group order information
   */
  async getGroupOrderDetails(
    groupOrderId: string,
    tailorId: string
  ): Promise<EnhancedGroupOrder | null> {
    return this.repository.getGroupOrderById(groupOrderId, tailorId);
  }

  /**
   * Submit design suggestion for group order
   */
  async submitDesignSuggestion(
    groupOrderId: string,
    tailorId: string,
    submission: DesignSuggestionSubmission
  ): Promise<DesignSuggestion> {
    // Validate submission
    if (!submission.suggestionText.trim()) {
      throw new Error('Suggestion text is required');
    }
    if (!submission.colorPalette.primary) {
      throw new Error('Primary color is required');
    }

    const suggestion: Omit<DesignSuggestion, 'id' | 'created_at'> = {
      groupOrderId,
      tailorId,
      suggestionText: submission.suggestionText,
      referenceImages: submission.referenceImages,
      colorPalette: submission.colorPalette,
      culturalTheme: submission.culturalTheme,
      customerApproved: false,
      approvalDate: null
    };

    const created = await this.repository.createDesignSuggestion(
      groupOrderId,
      tailorId,
      suggestion
    );

    // TODO: Send notification to customer about new design suggestion

    return created;
  }

  /**
   * Get design suggestions for group order
   */
  async getDesignSuggestions(groupOrderId: string): Promise<DesignSuggestion[]> {
    return this.repository.getDesignSuggestions(groupOrderId);
  }

  /**
   * Update coordination notes
   */
  async updateCoordinationNotes(
    groupOrderId: string,
    tailorId: string,
    notes: string
  ): Promise<void> {
    await this.repository.upsertCoordination(groupOrderId, tailorId, {
      coordinationNotes: notes
    });
  }

  /**
   * Get coordination data
   */
  async getCoordination(groupOrderId: string): Promise<TailorGroupCoordination | null> {
    return this.repository.getCoordination(groupOrderId);
  }

  /**
   * Verify tailor owns group order
   */
  async verifyTailorOwnership(
    groupOrderId: string,
    tailorId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('group_orders')
      .select('tailor_id')
      .eq('id', groupOrderId)
      .single();

    if (error) throw error;
    return data?.tailor_id === tailorId;
  }
}

