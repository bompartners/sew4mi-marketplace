import { Repository, DbClient } from '@sew4mi/shared/types'
import { Database } from '@sew4mi/shared/types'

type TailorProfile = Database['public']['Tables']['tailor_profiles']['Row']
type TailorProfileUpdate = Database['public']['Tables']['tailor_profiles']['Update']

export interface TailorSearchParams {
  city?: string
  region?: string
  specializations?: string[]
  minRating?: number
  maxDeliveryRadius?: number
  verifiedOnly?: boolean
  limit?: number
  offset?: number
}

export class TailorRepository extends Repository<TailorProfile> {
  constructor(client: DbClient) {
    super(client, 'tailor_profiles')
  }

  async findByUserId(userId: string): Promise<TailorProfile | null> {
    const { data, error } = await this.client
      .from('tailor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  }

  async findVerified(): Promise<TailorProfile[]> {
    const { data, error } = await this.client
      .from('tailor_profiles')
      .select('*')
      .eq('verification_status', 'VERIFIED')
      .eq('vacation_mode', false)
      .order('rating', { ascending: false })

    if (error) throw error

    return data || []
  }

  async search(params: TailorSearchParams): Promise<TailorProfile[]> {
    let query = this.client
      .from('tailor_profiles')
      .select('*')

    if (params.verifiedOnly !== false) {
      query = query.eq('verification_status', 'VERIFIED')
    }

    if (params.city) {
      query = query.ilike('city', `%${params.city}%`)
    }

    if (params.region) {
      query = query.eq('region', params.region)
    }

    if (params.minRating) {
      query = query.gte('rating', params.minRating)
    }

    if (params.specializations && params.specializations.length > 0) {
      query = query.contains('specializations', params.specializations)
    }

    query = query
      .eq('vacation_mode', false)
      .order('rating', { ascending: false })

    if (params.limit) {
      query = query.limit(params.limit)
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  }

  async findNearby(latitude: number, longitude: number, radiusKm: number): Promise<TailorProfile[]> {
    const { data, error } = await this.client
      .rpc('find_nearby_tailors', {
        lat: latitude,
        lng: longitude,
        radius_km: radiusKm
      })

    if (error) throw error

    return data || []
  }

  async updateRating(tailorId: string): Promise<void> {
    const { error } = await this.client
      .rpc('update_tailor_rating', {
        tailor_id: tailorId
      })

    if (error) throw error
  }

  async incrementOrderCount(tailorId: string): Promise<void> {
    const { data: profile, error: fetchError } = await this.client
      .from('tailor_profiles')
      .select('total_orders')
      .eq('id', tailorId)
      .single()

    if (fetchError) throw fetchError

    const { error: updateError } = await this.client
      .from('tailor_profiles')
      .update({ total_orders: (profile.total_orders || 0) + 1 })
      .eq('id', tailorId)

    if (updateError) throw updateError
  }

  async updateVacationMode(tailorId: string, vacationMode: boolean, message?: string): Promise<TailorProfile> {
    const updateData: TailorProfileUpdate = {
      vacation_mode: vacationMode,
      ...(message && { vacation_message: message })
    }

    const { data, error } = await this.client
      .from('tailor_profiles')
      .update(updateData)
      .eq('id', tailorId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async verify(tailorId: string, verifiedBy: string): Promise<TailorProfile> {
    const { data, error } = await this.client
      .from('tailor_profiles')
      .update({
        verification_status: 'VERIFIED' as const,
        verification_date: new Date().toISOString(),
        verified_by: verifiedBy
      })
      .eq('id', tailorId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async suspend(tailorId: string): Promise<TailorProfile> {
    const { data, error } = await this.client
      .from('tailor_profiles')
      .update({
        verification_status: 'SUSPENDED' as const
      })
      .eq('id', tailorId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async getTopRated(limit: number = 10): Promise<TailorProfile[]> {
    const { data, error } = await this.client
      .from('tailor_profiles')
      .select('*')
      .eq('verification_status', 'VERIFIED')
      .eq('vacation_mode', false)
      .gte('total_reviews', 5)
      .order('rating', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  }
}