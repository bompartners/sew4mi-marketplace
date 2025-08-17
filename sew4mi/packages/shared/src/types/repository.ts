import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database'

export type DbClient = SupabaseClient<Database>

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  select?: string
}

export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>
  findAll(options?: QueryOptions): Promise<T[]>
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
  count(): Promise<number>
}

// Database table type exports
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert'] 
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type TailorProfile = Database['public']['Tables']['tailor_profiles']['Row']
export type TailorProfileInsert = Database['public']['Tables']['tailor_profiles']['Insert']
export type TailorProfileUpdate = Database['public']['Tables']['tailor_profiles']['Update']

export type MeasurementProfile = Database['public']['Tables']['measurement_profiles']['Row']
export type MeasurementProfileInsert = Database['public']['Tables']['measurement_profiles']['Insert']
export type MeasurementProfileUpdate = Database['public']['Tables']['measurement_profiles']['Update']

// Profile completion status type
export interface ProfileCompletionStatus {
  isComplete: boolean
  missingFields: string[]
  completionPercentage: number
  nextStep?: string
}

// Profile update data types
export interface ProfileUpdateData {
  full_name?: string
  date_of_birth?: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  preferred_language?: string
  whatsapp_opted_in?: boolean
  whatsapp_number?: string
  avatar_url?: string
  metadata?: Record<string, any>
}

// Tailor profile completion data
export interface TailorProfileData {
  business_name: string
  bio?: string
  years_of_experience?: number
  specializations?: string[]
  location_name?: string
  city?: string
  region?: string
  delivery_radius_km?: number
  instagram_handle?: string
  facebook_page?: string
  tiktok_handle?: string
}

// User with profile status
export interface UserWithProfileStatus extends User {
  profileStatus: ProfileCompletionStatus
  tailorProfile?: TailorProfile
}

export abstract class Repository<T> implements BaseRepository<T> {
  protected client: DbClient
  protected tableName: string

  constructor(client: DbClient, tableName: string) {
    this.client = client
    this.tableName = tableName
  }

  protected async executeWithRetry<R>(
    operation: () => Promise<{ data: R | null, error: any }>,
    operationName: string = 'database operation'
  ): Promise<R> {
    try {
      const { data, error } = await operation()
      
      if (error) {
        throw error
      }
      
      return data as R
    } catch (error: any) {
      console.error(`${operationName} failed on table ${this.tableName}:`, error)
      throw error
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data as T
    } catch (error: any) {
      console.error(`findById failed for ${this.tableName} with id ${id}:`, error)
      
      // Re-throw PGRST116 as null (not found)
      if (error.code === 'PGRST116') {
        return null
      }
      
      throw error
    }
  }

  async findAll(options: QueryOptions = {}): Promise<T[]> {
    let query = this.client
      .from(this.tableName)
      .select(options.select || '*')

    if (options.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.orderDirection === 'asc'
      })
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) throw error

    return data as T[]
  }

  async create(data: Partial<T>): Promise<T> {
    const { data: created, error } = await this.client
      .from(this.tableName)
      .insert(data)
      .select()
      .single()

    if (error) throw error

    return created as T
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.client
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return updated as T
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async count(): Promise<number> {
    const { count, error } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return count || 0
  }

  async paginate(
    page: number = 1,
    pageSize: number = 10,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const offset = (page - 1) * pageSize
    
    const [data, totalCount] = await Promise.all([
      this.findAll({ ...options, limit: pageSize, offset }),
      this.count()
    ])

    return {
      data,
      count: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    }
  }
}