import { Repository, DbClient } from '@sew4mi/shared/types'
import { User, UserInsert, UserUpdate, TailorProfileRow, TailorProfileInsert, ProfileCompletionStatus, ProfileUpdateData, TailorProfileData, UserWithProfileStatus } from '@sew4mi/shared/types/repository'
import { withRetry } from '../supabase/retry'
import { mapSupabaseError } from '../supabase/errors'

export class UserRepository extends Repository<User> {
  constructor(client: DbClient) {
    super(client, 'users')
  }

  async findByEmail(email: string): Promise<User | null> {
    return withRetry(async () => {
      try {
        const { data, error } = await this.client
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            return null
          }
          throw mapSupabaseError(error)
        }

        return data
      } catch (error) {
        throw mapSupabaseError(error)
      }
    }, {
      maxAttempts: 2,
      onRetry: (error, attempt) => {
        console.warn(`findByEmail retry ${attempt} for ${email}: ${error.message}`)
      }
    })
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  }

  async findByRole(role: User['role']): Promise<User[]> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  }

  async updateWhatsAppOptIn(userId: string, optedIn: boolean, whatsappNumber?: string): Promise<User> {
    const updateData: UserUpdate = {
      whatsapp_opted_in: optedIn,
      ...(whatsappNumber && { whatsapp_number: whatsappNumber })
    }

    const { data, error } = await this.client
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async verifyPhone(userId: string): Promise<User> {
    const { data, error } = await this.client
      .from('users')
      .update({ phone_verified: true })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async softDelete(userId: string): Promise<void> {
    const { error } = await this.client
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error
  }

  async findActive(): Promise<User[]> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  }

  /**
   * Create a new user profile (called from auth trigger)
   */
  async createUserProfile(authUserId: string, data: Partial<UserInsert>): Promise<User> {
    const userData: UserInsert = {
      id: authUserId,
      full_name: data.full_name || '',
      email: data.email || null,
      phone_number: data.phone_number || null,
      role: data.role || 'CUSTOMER',
      preferred_language: data.preferred_language || 'en',
      whatsapp_opted_in: data.whatsapp_opted_in || false,
      phone_verified: false,
      ...data
    }

    return this.create(userData)
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: ProfileUpdateData): Promise<User> {
    const updateData: UserUpdate = {
      ...(data as any),
      updated_at: new Date().toISOString()
    }

    return this.update(userId, updateData)
  }

  /**
   * Get profile completion status
   */
  async getProfileCompletionStatus(user: User): Promise<ProfileCompletionStatus> {
    const requiredFields = ['full_name', 'email', 'preferred_language']
    const optionalFields = ['date_of_birth', 'gender', 'avatar_url']
    
    // Role-specific required fields
    if (user.role === 'TAILOR') {
      requiredFields.push('phone_number')
    }

    const missingRequired = requiredFields.filter(field => {
      const value = user[field as keyof User]
      return !value || (typeof value === 'string' && value.trim() === '')
    })

    const completedOptional = optionalFields.filter(field => {
      const value = user[field as keyof User]
      return value && (typeof value !== 'string' || value.trim() !== '')
    })

    const totalFields = requiredFields.length + optionalFields.length
    const completedFields = (requiredFields.length - missingRequired.length) + completedOptional.length
    const completionPercentage = Math.round((completedFields / totalFields) * 100)

    const isComplete = missingRequired.length === 0
    let nextStep: string | undefined

    if (!isComplete) {
      nextStep = `Complete your ${missingRequired[0].replace('_', ' ')}`
    } else if (user.role === 'TAILOR') {
      // Check if tailor profile exists
      const tailorProfile = await this.getTailorProfileRow(user.id)
      if (!tailorProfile) {
        nextStep = 'Set up your tailor business profile'
      }
    }

    return {
      isComplete,
      missingFields: missingRequired,
      completionPercentage,
      nextStep
    }
  }

  /**
   * Get user with profile completion status
   */
  async getUserWithProfileStatus(userId: string): Promise<UserWithProfileStatus | null> {
    const user = await this.findById(userId)
    if (!user) return null

    const profileStatus = await this.getProfileCompletionStatus(user)
    
    let tailorProfile: TailorProfileRow | undefined
    if (user.role === 'TAILOR') {
      tailorProfile = await this.getTailorProfileRow(userId) || undefined
    }

    return {
      ...user,
      profileStatus,
      tailorProfile
    }
  }

  /**
   * Create tailor profile
   */
  async createTailorProfileRow(userId: string, data: TailorProfileData): Promise<any> {
    try {
      const tailorData: TailorProfileInsert = {
        user_id: userId,
        business_name: data.business_name,
        bio: data.bio || null,
        years_of_experience: data.years_of_experience || null,
        specializations: data.specializations || [],
        location_name: data.location_name || null,
        city: data.city || null,
        region: data.region || null,
        delivery_radius_km: data.delivery_radius_km || 10,
        instagram_handle: data.instagram_handle || null,
        facebook_page: data.facebook_page || null,
        tiktok_handle: data.tiktok_handle || null,
        verification_status: 'PENDING',
        rating: 0,
        total_reviews: 0,
        total_orders: 0,
        completion_rate: 0,
        vacation_mode: false,
        accepts_rush_orders: false,
        rush_order_fee_percentage: 0,
        working_hours: {},
        pricing_tiers: {}
      }

      const { data: created, error } = await this.client
        .from('tailor_profiles')
        .insert(tailorData)
        .select()
        .single()

      if (error) throw error
      return created as TailorProfileRow
    } catch (error) {
      console.error('createTailorProfileRow failed:', error)
      throw error
    }
  }

  /**
   * Get tailor profile
   */
  async getTailorProfileRow(userId: string): Promise<TailorProfileRow | null> {
    try {
      const { data, error } = await this.client
        .from('tailor_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      return data as TailorProfileRow | null
    } catch (error) {
      console.error('getTailorProfileRow failed:', error)
      throw error
    }
  }

  /**
   * Update tailor profile
   */
  async updateTailorProfileRow(userId: string, data: Partial<TailorProfileData>): Promise<any> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: updated, error } = await this.client
        .from('tailor_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return updated as TailorProfileRow
    } catch (error) {
      console.error('updateTailorProfileRow failed:', error)
      throw error
    }
  }

  /**
   * Check if user profile needs completion
   */
  async needsProfileCompletion(userId: string): Promise<boolean> {
    const user = await this.findById(userId)
    if (!user) return true

    const status = await this.getProfileCompletionStatus(user)
    return !status.isComplete || (user.role === 'TAILOR' && !await this.getTailorProfileRow(userId))
  }
}