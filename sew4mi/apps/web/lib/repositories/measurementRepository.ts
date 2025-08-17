import { Repository, DbClient } from '@sew4mi/shared/types'
import { Database } from '@sew4mi/shared/types'

type MeasurementProfile = Database['public']['Tables']['measurement_profiles']['Row']
type MeasurementProfileInsert = Database['public']['Tables']['measurement_profiles']['Insert']

export interface MeasurementData {
  chest?: number
  waist?: number
  hips?: number
  inseam?: number
  sleeve?: number
  shoulder?: number
  neck?: number
  length?: number
  thigh?: number
  calf?: number
  armhole?: number
  bicep?: number
  wrist?: number
  [key: string]: number | undefined
}

export class MeasurementRepository extends Repository<MeasurementProfile> {
  constructor(client: DbClient) {
    super(client, 'measurement_profiles')
  }

  async findByUser(userId: string): Promise<MeasurementProfile[]> {
    const { data, error } = await this.client
      .from('measurement_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  }

  async findDefaultProfile(userId: string): Promise<MeasurementProfile | null> {
    const { data, error } = await this.client
      .from('measurement_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  }

  async createProfile(
    userId: string,
    profileName: string,
    measurements: MeasurementData,
    options?: {
      gender?: 'male' | 'female' | 'unisex'
      unit?: 'cm' | 'inches'
      notes?: string
      isDefault?: boolean
    }
  ): Promise<MeasurementProfile> {
    const insertData: MeasurementProfileInsert = {
      user_id: userId,
      profile_name: profileName,
      measurements: measurements as any,
      gender: options?.gender,
      measurement_unit: options?.unit || 'cm',
      notes: options?.notes,
      is_default: options?.isDefault || false
    }

    const { data, error } = await this.client
      .from('measurement_profiles')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async updateMeasurements(
    profileId: string,
    measurements: MeasurementData,
    updatedBy: string
  ): Promise<MeasurementProfile> {
    const { data, error } = await this.client
      .from('measurement_profiles')
      .update({
        measurements: measurements as any,
        last_updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async setAsDefault(profileId: string, userId: string): Promise<MeasurementProfile> {
    const { error: resetError } = await this.client
      .from('measurement_profiles')
      .update({ is_default: false })
      .eq('user_id', userId)

    if (resetError) throw resetError

    const { data, error } = await this.client
      .from('measurement_profiles')
      .update({ is_default: true })
      .eq('id', profileId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async duplicateProfile(
    profileId: string,
    newName: string,
    userId: string
  ): Promise<MeasurementProfile> {
    const { data: original, error: fetchError } = await this.client
      .from('measurement_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw fetchError

    const { data: duplicated, error: insertError } = await this.client
      .from('measurement_profiles')
      .insert({
        user_id: userId,
        profile_name: newName,
        gender: original.gender,
        measurements: original.measurements,
        measurement_unit: original.measurement_unit,
        notes: original.notes,
        is_default: false
      })
      .select()
      .single()

    if (insertError) throw insertError

    return duplicated
  }

  async convertUnits(
    profileId: string,
    toUnit: 'cm' | 'inches'
  ): Promise<MeasurementProfile> {
    const { data: profile, error: fetchError } = await this.client
      .from('measurement_profiles')
      .select('*')
      .eq('id', profileId)
      .single()

    if (fetchError) throw fetchError

    if (profile.measurement_unit === toUnit) {
      return profile
    }

    const conversionFactor = toUnit === 'inches' ? 0.393701 : 2.54
    const convertedMeasurements: MeasurementData = {}

    for (const [key, value] of Object.entries(profile.measurements as MeasurementData)) {
      if (typeof value === 'number') {
        convertedMeasurements[key] = Math.round(value * conversionFactor * 10) / 10
      }
    }

    const { data: updated, error: updateError } = await this.client
      .from('measurement_profiles')
      .update({
        measurements: convertedMeasurements as any,
        measurement_unit: toUnit
      })
      .eq('id', profileId)
      .select()
      .single()

    if (updateError) throw updateError

    return updated
  }

  async validateMeasurements(measurements: MeasurementData): Promise<boolean> {
    const requiredFields = ['chest', 'waist', 'hips']
    
    for (const field of requiredFields) {
      const value = measurements[field]
      if (value === undefined || value === null || value <= 0) {
        return false
      }
    }

    for (const [, value] of Object.entries(measurements)) {
      if (typeof value === 'number' && (value < 0 || value > 300)) {
        return false
      }
    }

    return true
  }
}