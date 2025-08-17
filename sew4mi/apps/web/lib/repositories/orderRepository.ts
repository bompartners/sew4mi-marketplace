import { Repository, DbClient } from '@sew4mi/shared/types'
import { Database } from '@sew4mi/shared/types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderUpdate = Database['public']['Tables']['orders']['Update']
type OrderStatus = Database['public']['Enums']['order_status']
type EscrowStage = Database['public']['Enums']['escrow_stage']

export interface OrderFilters {
  customerId?: string
  tailorId?: string
  status?: OrderStatus | OrderStatus[]
  fromDate?: string
  toDate?: string
  groupOrderId?: string
  rushOrder?: boolean
}

export class OrderRepository extends Repository<Order> {
  constructor(client: DbClient) {
    super(client, 'orders')
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  }

  async findByTailor(tailorId: string): Promise<Order[]> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('tailor_id', tailorId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  }

  async findWithFilters(filters: OrderFilters): Promise<Order[]> {
    let query = this.client
      .from('orders')
      .select('*')

    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId)
    }

    if (filters.tailorId) {
      query = query.eq('tailor_id', filters.tailorId)
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters.fromDate) {
      query = query.gte('created_at', filters.fromDate)
    }

    if (filters.toDate) {
      query = query.lte('created_at', filters.toDate)
    }

    if (filters.groupOrderId) {
      query = query.eq('group_order_id', filters.groupOrderId)
    }

    if (filters.rushOrder !== undefined) {
      query = query.eq('rush_order', filters.rushOrder)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    return data || []
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const updateData: OrderUpdate = {
      status
    }

    if (status === 'ACCEPTED') {
      updateData.accepted_at = new Date().toISOString()
    } else if (status === 'COMPLETED') {
      updateData.completed_at = new Date().toISOString()
    } else if (status === 'CANCELLED') {
      updateData.cancelled_at = new Date().toISOString()
    }

    const { data, error } = await this.client
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async updateEscrowStage(orderId: string, stage: EscrowStage, balance: number): Promise<Order> {
    const { data, error } = await this.client
      .from('orders')
      .update({
        escrow_stage: stage,
        escrow_balance: balance
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const { data, error } = await this.client
      .from('orders')
      .update({
        status: 'CANCELLED' as OrderStatus,
        cancelled_at: new Date().toISOString(),
        cancelled_reason: reason
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error

    return data
  }

  async getActiveOrders(tailorId: string): Promise<Order[]> {
    const activeStatuses: OrderStatus[] = [
      'ACCEPTED',
      'DEPOSIT_PAID',
      'MEASUREMENT_CONFIRMED',
      'FABRIC_SOURCED',
      'CUTTING_STARTED',
      'SEWING_IN_PROGRESS',
      'FITTING_SCHEDULED',
      'FITTING_COMPLETED',
      'ADJUSTMENTS_IN_PROGRESS',
      'FINAL_INSPECTION',
      'READY_FOR_DELIVERY'
    ]

    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('tailor_id', tailorId)
      .in('status', activeStatuses)
      .order('delivery_date', { ascending: true })

    if (error) throw error

    return data || []
  }

  async getUpcomingDeliveries(days: number = 7): Promise<Order[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .gte('delivery_date', new Date().toISOString())
      .lte('delivery_date', futureDate.toISOString())
      .in('status', ['READY_FOR_DELIVERY', 'FINAL_INSPECTION'])
      .order('delivery_date', { ascending: true })

    if (error) throw error

    return data || []
  }

  async getOrderStatistics(tailorId: string): Promise<{
    total: number
    completed: number
    inProgress: number
    cancelled: number
    completionRate: number
  }> {
    const { data, error } = await this.client
      .from('orders')
      .select('status')
      .eq('tailor_id', tailorId)

    if (error) throw error

    const orders = data || []
    const total = orders.length
    const completed = orders.filter(o => o.status === 'COMPLETED').length
    const cancelled = orders.filter(o => o.status === 'CANCELLED').length
    const inProgress = total - completed - cancelled

    return {
      total,
      completed,
      inProgress,
      cancelled,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    }
  }
}