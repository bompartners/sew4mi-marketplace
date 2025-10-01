import { Repository, DbClient } from '@sew4mi/shared/types'
import { Database } from '@sew4mi/shared/types'
import { MilestoneStage, MilestoneApprovalStatus } from '@sew4mi/shared/types'

type MilestoneRow = Database['public']['Tables']['order_milestones']['Row']
type MilestoneInsert = Database['public']['Tables']['order_milestones']['Insert']
type MilestoneUpdate = Database['public']['Tables']['order_milestones']['Update']

export interface MilestoneWithOrder extends MilestoneRow {
  order: {
    id: string
    customer_id: string
    tailor_id: string
    status: string
  }
}

export class MilestoneRepository extends Repository<MilestoneRow> {
  constructor(client: DbClient) {
    super(client, 'order_milestones')
  }

  async findByIdWithOrder(milestoneId: string): Promise<MilestoneWithOrder | null> {
    const { data, error } = await this.client
      .from('order_milestones')
      .select(`
        *,
        order:orders!order_id (
          id,
          customer_id,
          tailor_id,
          status
        )
      `)
      .eq('id', milestoneId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data as MilestoneWithOrder
  }

  async findByOrderId(orderId: string): Promise<MilestoneRow[]> {
    const { data, error } = await this.client
      .from('order_milestones')
      .select('*')
      .eq('order_id', orderId)
      .order('verified_at', { ascending: true })

    if (error) throw error

    return data || []
  }

  async findByOrderAndStage(orderId: string, stage: MilestoneStage): Promise<MilestoneRow | null> {
    const { data, error } = await this.client
      .from('order_milestones')
      .select('*')
      .eq('order_id', orderId)
      .eq('milestone', stage)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  }

  async createMilestone(milestoneData: MilestoneInsert): Promise<MilestoneRow> {
    const { data, error } = await this.client
      .from('order_milestones')
      .insert(milestoneData)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async updateMilestoneWithPhoto(
    milestoneId: string,
    photoUrl: string,
    notes?: string
  ): Promise<MilestoneRow> {
    const updateData: MilestoneUpdate = {
      photo_url: photoUrl,
      notes: notes || '',
      verified_at: new Date().toISOString(),
      approval_status: 'PENDING' as MilestoneApprovalStatus,
      auto_approval_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours from now
    }

    const { data, error } = await this.client
      .from('order_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async updateApprovalStatus(
    milestoneId: string,
    status: MilestoneApprovalStatus,
    rejectionReason?: string
  ): Promise<MilestoneRow> {
    const updateData: MilestoneUpdate = {
      approval_status: status,
      customer_reviewed_at: new Date().toISOString(),
      rejection_reason: status === 'REJECTED' ? rejectionReason : null
    }

    const { data, error } = await this.client
      .from('order_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async validateUserPermission(milestoneId: string, userId: string): Promise<{
    canUpload: boolean
    milestone?: MilestoneWithOrder
    reason?: string
  }> {
    try {
      const milestone = await this.findByIdWithOrder(milestoneId)
      
      if (!milestone) {
        return { canUpload: false, reason: 'Milestone not found' }
      }

      // Check if user is the tailor for this order
      if (milestone.order.tailor_id !== userId) {
        return { 
          canUpload: false, 
          milestone, 
          reason: 'Only the assigned tailor can upload photos for this milestone' 
        }
      }

      // Check if milestone is still in a state that allows photo upload
      if (milestone.approval_status === 'APPROVED') {
        return { 
          canUpload: false, 
          milestone, 
          reason: 'Milestone has already been approved' 
        }
      }

      // If milestone is rejected, allow re-upload
      return { canUpload: true, milestone }

    } catch (error) {
      console.error('Error validating user permission:', error)
      return { canUpload: false, reason: 'Permission validation failed' }
    }
  }

  async getPendingMilestones(orderId?: string): Promise<MilestoneRow[]> {
    let query = this.client
      .from('order_milestones')
      .select('*')
      .eq('approval_status', 'PENDING')

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data, error } = await query.order('verified_at', { ascending: true })

    if (error) throw error

    return data || []
  }

  async getOverdueMilestones(): Promise<MilestoneRow[]> {
    const { data, error } = await this.client
      .from('order_milestones')
      .select('*')
      .eq('approval_status', 'PENDING')
      .lt('auto_approval_deadline', new Date().toISOString())
      .order('auto_approval_deadline', { ascending: true })

    if (error) throw error

    return data || []
  }
}