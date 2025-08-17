export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          phone_number: string | null
          phone_verified: boolean
          full_name: string
          role: 'CUSTOMER' | 'TAILOR' | 'ADMIN'
          avatar_url: string | null
          date_of_birth: string | null
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          preferred_language: string
          whatsapp_opted_in: boolean
          whatsapp_number: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          metadata: Json
        }
        Insert: {
          id: string
          email?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          full_name: string
          role?: 'CUSTOMER' | 'TAILOR' | 'ADMIN'
          avatar_url?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          preferred_language?: string
          whatsapp_opted_in?: boolean
          whatsapp_number?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          email?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          full_name?: string
          role?: 'CUSTOMER' | 'TAILOR' | 'ADMIN'
          avatar_url?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          preferred_language?: string
          whatsapp_opted_in?: boolean
          whatsapp_number?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          metadata?: Json
        }
      }
      tailor_profiles: {
        Row: {
          id: string
          user_id: string
          business_name: string
          bio: string | null
          years_of_experience: number | null
          specializations: string[]
          portfolio_url: string | null
          location: unknown | null
          location_name: string | null
          city: string | null
          region: string | null
          delivery_radius_km: number
          verification_status: 'PENDING' | 'VERIFIED' | 'SUSPENDED'
          verification_date: string | null
          verified_by: string | null
          rating: number
          total_reviews: number
          total_orders: number
          completion_rate: number
          response_time_hours: number | null
          pricing_tiers: Json
          working_hours: Json
          vacation_mode: boolean
          vacation_message: string | null
          accepts_rush_orders: boolean
          rush_order_fee_percentage: number
          instagram_handle: string | null
          facebook_page: string | null
          tiktok_handle: string | null
          bank_account_details: Json | null
          mobile_money_details: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          bio?: string | null
          years_of_experience?: number | null
          specializations?: string[]
          portfolio_url?: string | null
          location?: unknown | null
          location_name?: string | null
          city?: string | null
          region?: string | null
          delivery_radius_km?: number
          verification_status?: 'PENDING' | 'VERIFIED' | 'SUSPENDED'
          verification_date?: string | null
          verified_by?: string | null
          rating?: number
          total_reviews?: number
          total_orders?: number
          completion_rate?: number
          response_time_hours?: number | null
          pricing_tiers?: Json
          working_hours?: Json
          vacation_mode?: boolean
          vacation_message?: string | null
          accepts_rush_orders?: boolean
          rush_order_fee_percentage?: number
          instagram_handle?: string | null
          facebook_page?: string | null
          tiktok_handle?: string | null
          bank_account_details?: Json | null
          mobile_money_details?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          bio?: string | null
          years_of_experience?: number | null
          specializations?: string[]
          portfolio_url?: string | null
          location?: unknown | null
          location_name?: string | null
          city?: string | null
          region?: string | null
          delivery_radius_km?: number
          verification_status?: 'PENDING' | 'VERIFIED' | 'SUSPENDED'
          verification_date?: string | null
          verified_by?: string | null
          rating?: number
          total_reviews?: number
          total_orders?: number
          completion_rate?: number
          response_time_hours?: number | null
          pricing_tiers?: Json
          working_hours?: Json
          vacation_mode?: boolean
          vacation_message?: string | null
          accepts_rush_orders?: boolean
          rush_order_fee_percentage?: number
          instagram_handle?: string | null
          facebook_page?: string | null
          tiktok_handle?: string | null
          bank_account_details?: Json | null
          mobile_money_details?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      measurement_profiles: {
        Row: {
          id: string
          user_id: string
          profile_name: string
          is_default: boolean
          gender: 'male' | 'female' | 'unisex' | null
          measurements: Json
          measurement_unit: 'cm' | 'inches'
          notes: string | null
          last_updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          profile_name: string
          is_default?: boolean
          gender?: 'male' | 'female' | 'unisex' | null
          measurements?: Json
          measurement_unit?: 'cm' | 'inches'
          notes?: string | null
          last_updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          profile_name?: string
          is_default?: boolean
          gender?: 'male' | 'female' | 'unisex' | null
          measurements?: Json
          measurement_unit?: 'cm' | 'inches'
          notes?: string | null
          last_updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string
          tailor_id: string
          measurement_profile_id: string | null
          status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'DEPOSIT_PAID' | 'MEASUREMENT_CONFIRMED' | 
                  'FABRIC_SOURCED' | 'CUTTING_STARTED' | 'SEWING_IN_PROGRESS' | 'FITTING_SCHEDULED' | 
                  'FITTING_COMPLETED' | 'ADJUSTMENTS_IN_PROGRESS' | 'FINAL_INSPECTION' | 
                  'READY_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'
          garment_type: string
          style_preferences: Json
          fabric_details: Json
          quantity: number
          total_amount: number
          deposit_amount: number
          fitting_payment_amount: number | null
          final_payment_amount: number | null
          currency: 'GHS' | 'USD'
          escrow_stage: 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED' | 'REFUNDED'
          escrow_balance: number
          delivery_method: 'pickup' | 'delivery' | 'courier' | null
          delivery_address: Json | null
          delivery_date: string | null
          rush_order: boolean
          rush_fee: number | null
          special_instructions: string | null
          reference_images: string[]
          order_notes: string | null
          group_order_id: string | null
          created_at: string
          accepted_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          order_number?: string
          customer_id: string
          tailor_id: string
          measurement_profile_id?: string | null
          status?: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'DEPOSIT_PAID' | 'MEASUREMENT_CONFIRMED' | 
                  'FABRIC_SOURCED' | 'CUTTING_STARTED' | 'SEWING_IN_PROGRESS' | 'FITTING_SCHEDULED' | 
                  'FITTING_COMPLETED' | 'ADJUSTMENTS_IN_PROGRESS' | 'FINAL_INSPECTION' | 
                  'READY_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'
          garment_type: string
          style_preferences?: Json
          fabric_details?: Json
          quantity?: number
          total_amount: number
          deposit_amount: number
          fitting_payment_amount?: number | null
          final_payment_amount?: number | null
          currency?: 'GHS' | 'USD'
          escrow_stage?: 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED' | 'REFUNDED'
          escrow_balance?: number
          delivery_method?: 'pickup' | 'delivery' | 'courier' | null
          delivery_address?: Json | null
          delivery_date?: string | null
          rush_order?: boolean
          rush_fee?: number | null
          special_instructions?: string | null
          reference_images?: string[]
          order_notes?: string | null
          group_order_id?: string | null
          created_at?: string
          accepted_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          order_number?: string
          customer_id?: string
          tailor_id?: string
          measurement_profile_id?: string | null
          status?: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'DEPOSIT_PAID' | 'MEASUREMENT_CONFIRMED' | 
                  'FABRIC_SOURCED' | 'CUTTING_STARTED' | 'SEWING_IN_PROGRESS' | 'FITTING_SCHEDULED' | 
                  'FITTING_COMPLETED' | 'ADJUSTMENTS_IN_PROGRESS' | 'FINAL_INSPECTION' | 
                  'READY_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'
          garment_type?: string
          style_preferences?: Json
          fabric_details?: Json
          quantity?: number
          total_amount?: number
          deposit_amount?: number
          fitting_payment_amount?: number | null
          final_payment_amount?: number | null
          currency?: 'GHS' | 'USD'
          escrow_stage?: 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED' | 'REFUNDED'
          escrow_balance?: number
          delivery_method?: 'pickup' | 'delivery' | 'courier' | null
          delivery_address?: Json | null
          delivery_date?: string | null
          rush_order?: boolean
          rush_fee?: number | null
          special_instructions?: string | null
          reference_images?: string[]
          order_notes?: string | null
          group_order_id?: string | null
          created_at?: string
          accepted_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          updated_at?: string
          metadata?: Json
        }
      }
      order_milestones: {
        Row: {
          id: string
          order_id: string
          milestone_type: string
          milestone_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | null
          started_at: string | null
          completed_at: string | null
          completed_by: string | null
          photo_urls: string[]
          video_url: string | null
          notes: string | null
          customer_approved: boolean
          customer_approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          milestone_type: string
          milestone_status?: 'pending' | 'in_progress' | 'completed' | 'skipped' | null
          started_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          photo_urls?: string[]
          video_url?: string | null
          notes?: string | null
          customer_approved?: boolean
          customer_approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          milestone_type?: string
          milestone_status?: 'pending' | 'in_progress' | 'completed' | 'skipped' | null
          started_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          photo_urls?: string[]
          video_url?: string | null
          notes?: string | null
          customer_approved?: boolean
          customer_approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payment_transactions: {
        Row: {
          id: string
          transaction_id: string
          order_id: string
          user_id: string
          transaction_type: 'DEPOSIT' | 'FITTING_PAYMENT' | 'FINAL_PAYMENT' | 'REFUND' | 
                           'DISPUTE_RESOLUTION' | 'PLATFORM_FEE'
          amount: number
          currency: string
          payment_provider: 'MTN_MOMO' | 'VODAFONE_CASH' | 'BANK_TRANSFER' | 'CASH'
          provider_transaction_id: string | null
          status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
          escrow_stage: 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED' | 'REFUNDED' | null
          payment_phone: string | null
          payment_metadata: Json
          initiated_at: string
          processed_at: string | null
          completed_at: string | null
          failed_at: string | null
          failure_reason: string | null
          refunded_at: string | null
          refund_amount: number | null
          refund_reason: string | null
          fee_amount: number | null
          net_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          order_id: string
          user_id: string
          transaction_type: 'DEPOSIT' | 'FITTING_PAYMENT' | 'FINAL_PAYMENT' | 'REFUND' | 
                           'DISPUTE_RESOLUTION' | 'PLATFORM_FEE'
          amount: number
          currency?: string
          payment_provider: 'MTN_MOMO' | 'VODAFONE_CASH' | 'BANK_TRANSFER' | 'CASH'
          provider_transaction_id?: string | null
          status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
          escrow_stage?: 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED' | 'REFUNDED' | null
          payment_phone?: string | null
          payment_metadata?: Json
          initiated_at?: string
          processed_at?: string | null
          completed_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          refunded_at?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          fee_amount?: number | null
          net_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          order_id?: string
          user_id?: string
          transaction_type?: 'DEPOSIT' | 'FITTING_PAYMENT' | 'FINAL_PAYMENT' | 'REFUND' | 
                           'DISPUTE_RESOLUTION' | 'PLATFORM_FEE'
          amount?: number
          currency?: string
          payment_provider?: 'MTN_MOMO' | 'VODAFONE_CASH' | 'BANK_TRANSFER' | 'CASH'
          provider_transaction_id?: string | null
          status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
          escrow_stage?: 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED' | 'REFUNDED' | null
          payment_phone?: string | null
          payment_metadata?: Json
          initiated_at?: string
          processed_at?: string | null
          completed_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          refunded_at?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          fee_amount?: number | null
          net_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      group_orders: {
        Row: {
          id: string
          group_name: string
          organizer_id: string
          event_type: string | null
          event_date: string | null
          total_participants: number
          total_orders: number
          group_discount_percentage: number
          status: 'open' | 'closed' | 'processing' | 'completed' | 'cancelled' | null
          whatsapp_group_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_name: string
          organizer_id: string
          event_type?: string | null
          event_date?: string | null
          total_participants?: number
          total_orders?: number
          group_discount_percentage?: number
          status?: 'open' | 'closed' | 'processing' | 'completed' | 'cancelled' | null
          whatsapp_group_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_name?: string
          organizer_id?: string
          event_type?: string | null
          event_date?: string | null
          total_participants?: number
          total_orders?: number
          group_discount_percentage?: number
          status?: 'open' | 'closed' | 'processing' | 'completed' | 'cancelled' | null
          whatsapp_group_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          order_id: string
          customer_id: string
          tailor_id: string
          rating: number
          quality_rating: number | null
          communication_rating: number | null
          timeliness_rating: number | null
          value_rating: number | null
          review_text: string | null
          tailor_response: string | null
          tailor_responded_at: string | null
          photo_urls: string[]
          is_verified_purchase: boolean
          helpful_count: number
          reported: boolean
          reported_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          customer_id: string
          tailor_id: string
          rating: number
          quality_rating?: number | null
          communication_rating?: number | null
          timeliness_rating?: number | null
          value_rating?: number | null
          review_text?: string | null
          tailor_response?: string | null
          tailor_responded_at?: string | null
          photo_urls?: string[]
          is_verified_purchase?: boolean
          helpful_count?: number
          reported?: boolean
          reported_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          customer_id?: string
          tailor_id?: string
          rating?: number
          quality_rating?: number | null
          communication_rating?: number | null
          timeliness_rating?: number | null
          value_rating?: number | null
          review_text?: string | null
          tailor_response?: string | null
          tailor_responded_at?: string | null
          photo_urls?: string[]
          is_verified_purchase?: boolean
          helpful_count?: number
          reported?: boolean
          reported_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      disputes: {
        Row: {
          id: string
          order_id: string
          raised_by: string
          dispute_type: string
          status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'CLOSED'
          description: string
          evidence_urls: string[]
          assigned_to: string | null
          resolution: string | null
          resolution_date: string | null
          refund_amount: number | null
          compensation_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          raised_by: string
          dispute_type: string
          status?: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'CLOSED'
          description: string
          evidence_urls?: string[]
          assigned_to?: string | null
          resolution?: string | null
          resolution_date?: string | null
          refund_amount?: number | null
          compensation_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          raised_by?: string
          dispute_type?: string
          status?: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'CLOSED'
          description?: string
          evidence_urls?: string[]
          assigned_to?: string | null
          resolution?: string | null
          resolution_date?: string | null
          refund_amount?: number | null
          compensation_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_tailor: {
        Args: Record<string, never>
        Returns: boolean
      }
      owns_order: {
        Args: {
          order_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'CUSTOMER' | 'TAILOR' | 'ADMIN'
      verification_status: 'PENDING' | 'VERIFIED' | 'SUSPENDED'
      order_status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'DEPOSIT_PAID' | 'MEASUREMENT_CONFIRMED' | 
                    'FABRIC_SOURCED' | 'CUTTING_STARTED' | 'SEWING_IN_PROGRESS' | 'FITTING_SCHEDULED' | 
                    'FITTING_COMPLETED' | 'ADJUSTMENTS_IN_PROGRESS' | 'FINAL_INSPECTION' | 
                    'READY_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'
      escrow_stage: 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED' | 'REFUNDED'
      transaction_type: 'DEPOSIT' | 'FITTING_PAYMENT' | 'FINAL_PAYMENT' | 'REFUND' | 
                       'DISPUTE_RESOLUTION' | 'PLATFORM_FEE'
      payment_provider: 'MTN_MOMO' | 'VODAFONE_CASH' | 'BANK_TRANSFER' | 'CASH'
      payment_status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
      dispute_status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'CLOSED'
    }
  }
}