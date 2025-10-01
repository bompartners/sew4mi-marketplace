/**
 * Unit tests for GroupOrderRepository
 * Tests data access layer for group orders
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroupOrderRepository } from '@/lib/repositories/groupOrderRepository';
import type { DbClient } from '@sew4mi/shared/types/repository';

/**
 * Mock database client
 */
const createMockDbClient = () => {
  const mockClient: Partial<DbClient> = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
  };
  return mockClient as DbClient;
};

/**
 * Mock group order data
 */
const mockGroupOrderRow = {
  id: 'group-order-001',
  group_name: 'Test Wedding Order',
  organizer_id: 'user-001',
  event_type: 'WEDDING',
  event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  total_participants: 3,
  total_orders: 3,
  group_discount_percentage: 15,
  status: 'IN_PROGRESS',
  whatsapp_group_id: null,
  notes: null,
  bulk_discount_percentage: 15,
  total_original_amount: 750,
  total_discounted_amount: 637.5,
  payment_mode: 'SINGLE_PAYER',
  delivery_strategy: 'ALL_TOGETHER',
  shared_fabric: true,
  fabric_type: 'KENTE',
  fabric_color: 'Royal Blue',
  fabric_pattern: null,
  total_yardage: 30,
  cost_per_yard: 50,
  total_fabric_cost: 1500,
  preferred_vendor: null,
  fabric_lot: null,
  fabric_source: 'TAILOR_SOURCED',
  coordination_notes: 'Match all outfits with traditional theme',
  tailor_id: 'tailor-001',
  estimated_completion_date: null,
  group_order_number: 'GRP240930001',
  completed_items: 0,
  in_progress_items: 3,
  ready_for_delivery: 0,
  pending_items: 0,
  overall_progress_percentage: 0,
  estimated_days_remaining: null,
  next_group_milestone: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('GroupOrderRepository', () => {
  let repository: GroupOrderRepository;
  let mockClient: DbClient;

  beforeEach(() => {
    mockClient = createMockDbClient();
    repository = new GroupOrderRepository(mockClient);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should fetch group order by ID successfully', async () => {
      // Mock successful response
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockGroupOrderRow,
        error: null,
      });
      mockClient.single = mockSingle;

      const result = await repository.findById('group-order-001');

      expect(mockClient.from).toHaveBeenCalledWith('group_orders');
      expect(mockClient.select).toHaveBeenCalledWith('*');
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'group-order-001');
      expect(result).toEqual(mockGroupOrderRow);
    });

    it('should throw error when fetching fails', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });
      mockClient.single = mockSingle;

      await expect(repository.findById('nonexistent')).rejects.toThrow(
        'Failed to fetch group order: Database error'
      );
    });
  });

  describe('findByOrganizer', () => {
    it('should fetch all group orders for a user', async () => {
      const mockGroupOrders = [mockGroupOrderRow, { ...mockGroupOrderRow, id: 'group-order-002' }];
      
      mockClient = {
        ...mockClient,
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockGroupOrders,
          error: null,
        }),
      } as DbClient;
      
      repository = new GroupOrderRepository(mockClient);

      const result = await repository.findByOrganizer('user-001');

      expect(mockClient.from).toHaveBeenCalledWith('group_orders');
      expect(mockClient.eq).toHaveBeenCalledWith('organizer_id', 'user-001');
      expect(mockClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(mockGroupOrders);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no group orders found', async () => {
      mockClient.order = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.findByOrganizer('user-without-orders');

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockClient.order = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' },
      });

      await expect(repository.findByOrganizer('user-001')).rejects.toThrow(
        'Failed to fetch group orders: Connection failed'
      );
    });
  });

  describe('create', () => {
    it('should create a new group order successfully', async () => {
      const newGroupOrder = {
        group_name: 'New Wedding Order',
        organizer_id: 'user-002',
        total_participants: 4,
        payment_mode: 'SINGLE_PAYER',
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockGroupOrderRow, ...newGroupOrder },
        error: null,
      });
      mockClient.single = mockSingle;

      const result = await repository.create(newGroupOrder);

      expect(mockClient.from).toHaveBeenCalledWith('group_orders');
      expect(mockClient.insert).toHaveBeenCalledWith(newGroupOrder);
      expect(mockClient.select).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.group_name).toBe('New Wedding Order');
    });

    it('should throw error when creation fails', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Validation failed' },
      });
      mockClient.single = mockSingle;

      await expect(repository.create({})).rejects.toThrow(
        'Failed to create group order: Validation failed'
      );
    });
  });

  describe('update', () => {
    it('should update group order successfully', async () => {
      const updates = {
        status: 'COMPLETED',
        overall_progress_percentage: 100,
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockGroupOrderRow, ...updates },
        error: null,
      });
      mockClient.single = mockSingle;

      const result = await repository.update('group-order-001', updates);

      expect(mockClient.from).toHaveBeenCalledWith('group_orders');
      expect(mockClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String),
        })
      );
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'group-order-001');
      expect(result.status).toBe('COMPLETED');
      expect(result.overall_progress_percentage).toBe(100);
    });

    it('should automatically set updated_at timestamp', async () => {
      const updates = { status: 'IN_PROGRESS' };
      let capturedUpdate: any;

      mockClient.update = vi.fn((data) => {
        capturedUpdate = data;
        return mockClient;
      });
      mockClient.single = vi.fn().mockResolvedValue({
        data: { ...mockGroupOrderRow, ...updates },
        error: null,
      });

      await repository.update('group-order-001', updates);

      expect(capturedUpdate).toHaveProperty('updated_at');
      expect(capturedUpdate.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date format
    });

    it('should throw error when update fails', async () => {
      mockClient.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(repository.update('group-order-001', {})).rejects.toThrow(
        'Failed to update group order: Update failed'
      );
    });
  });

  describe('delete', () => {
    it('should delete group order successfully', async () => {
      mockClient.delete = vi.fn().mockResolvedValue({
        error: null,
      });

      await repository.delete('group-order-001');

      expect(mockClient.from).toHaveBeenCalledWith('group_orders');
      expect(mockClient.delete).toHaveBeenCalled();
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'group-order-001');
    });

    it('should throw error when delete fails', async () => {
      mockClient.delete = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      await expect(repository.delete('group-order-001')).rejects.toThrow(
        'Failed to delete group order: Delete failed'
      );
    });
  });

  describe('count', () => {
    it('should return count of group orders', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          count: 5,
          error: null,
        }),
      } as unknown as DbClient;

      repository = new GroupOrderRepository(mockClient);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockClient.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('should return 0 when no group orders exist', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          count: null,
          error: null,
        }),
      } as unknown as DbClient;

      repository = new GroupOrderRepository(mockClient);

      const result = await repository.count();

      expect(result).toBe(0);
    });

    it('should throw error on count failure', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          count: null,
          error: { message: 'Count failed' },
        }),
      } as unknown as DbClient;

      repository = new GroupOrderRepository(mockClient);

      await expect(repository.count()).rejects.toThrow('Failed to count group orders: Count failed');
    });
  });

  describe('findItems', () => {
    it('should fetch all items for a group order', async () => {
      const mockItems = [
        { id: 'item-001', group_order_id: 'group-order-001', family_member_name: 'Mother' },
        { id: 'item-002', group_order_id: 'group-order-001', family_member_name: 'Father' },
      ];

      mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockItems,
          error: null,
        }),
      } as DbClient;

      repository = new GroupOrderRepository(mockClient);

      const result = await repository.findItems('group-order-001');

      expect(mockClient.from).toHaveBeenCalledWith('group_order_items');
      expect(mockClient.eq).toHaveBeenCalledWith('group_order_id', 'group-order-001');
      expect(result).toEqual(mockItems);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no items found', async () => {
      mockClient.eq = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.findItems('group-order-empty');

      expect(result).toEqual([]);
    });
  });

  describe('findPaymentTracking', () => {
    it('should fetch payment tracking for a group order', async () => {
      const mockPayments = [
        { id: 'payment-001', group_order_id: 'group-order-001', paid_amount: 200 },
      ];

      mockClient.eq = vi.fn().mockResolvedValue({
        data: mockPayments,
        error: null,
      });

      const result = await repository.findPaymentTracking('group-order-001');

      expect(mockClient.from).toHaveBeenCalledWith('group_payment_tracking');
      expect(result).toEqual(mockPayments);
    });
  });

  describe('findDeliverySchedules', () => {
    it('should fetch delivery schedules for a group order', async () => {
      const mockSchedules = [
        { id: 'schedule-001', group_order_id: 'group-order-001', scheduled_date: '2024-12-01' },
      ];

      mockClient.eq = vi.fn().mockResolvedValue({
        data: mockSchedules,
        error: null,
      });

      const result = await repository.findDeliverySchedules('group-order-001');

      expect(mockClient.from).toHaveBeenCalledWith('group_delivery_schedules');
      expect(result).toEqual(mockSchedules);
    });
  });

  describe('createItem', () => {
    it('should create a group order item', async () => {
      const itemData = {
        group_order_id: 'group-order-001',
        order_id: 'order-001',
        family_member_name: 'Mother',
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...itemData, id: 'item-001' },
        error: null,
      });
      mockClient.single = mockSingle;

      const result = await repository.createItem(itemData);

      expect(mockClient.from).toHaveBeenCalledWith('group_order_items');
      expect(mockClient.insert).toHaveBeenCalledWith(itemData);
      expect(result.id).toBe('item-001');
    });

    it('should throw error when item creation fails', async () => {
      mockClient.single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' },
      });

      await expect(repository.createItem({})).rejects.toThrow(
        'Failed to create group order item: Creation failed'
      );
    });
  });

  describe('updateProgress', () => {
    it('should update group order progress', async () => {
      const progressData = {
        completed_items: 1,
        in_progress_items: 2,
        ready_for_delivery: 0,
        pending_items: 0,
        overall_progress_percentage: 33,
      };

      mockClient.eq = vi.fn().mockResolvedValue({
        error: null,
      });

      await repository.updateProgress('group-order-001', progressData);

      expect(mockClient.from).toHaveBeenCalledWith('group_orders');
      expect(mockClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...progressData,
          updated_at: expect.any(String),
        })
      );
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'group-order-001');
    });

    it('should throw error on progress update failure', async () => {
      mockClient.eq = vi.fn().mockResolvedValue({
        error: { message: 'Update failed' },
      });

      const progressData = {
        completed_items: 1,
        in_progress_items: 0,
        ready_for_delivery: 0,
        pending_items: 0,
        overall_progress_percentage: 100,
      };

      await expect(repository.updateProgress('group-order-001', progressData)).rejects.toThrow(
        'Failed to update group order progress: Update failed'
      );
    });
  });

  describe('findAll', () => {
    it('should fetch all group orders', async () => {
      const mockGroupOrders = [mockGroupOrderRow];

      mockClient.order = vi.fn().mockResolvedValue({
        data: mockGroupOrders,
        error: null,
      });

      const result = await repository.findAll();

      expect(mockClient.from).toHaveBeenCalledWith('group_orders');
      expect(mockClient.select).toHaveBeenCalledWith('*');
      expect(mockClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(mockGroupOrders);
    });

    it('should return empty array when no orders exist', async () => {
      mockClient.order = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });
});

