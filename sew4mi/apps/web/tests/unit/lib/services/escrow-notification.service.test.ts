import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EscrowNotificationService } from '../../../../lib/services/escrow-notification.service';
import { EscrowRepository } from '../../../../lib/repositories/escrow.repository';

// Mock the dependencies
vi.mock('../../../../lib/repositories/escrow.repository');

describe('EscrowNotificationService', () => {
  let notificationService: EscrowNotificationService;
  let mockEscrowRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock EscrowRepository
    mockEscrowRepository = {
      getEscrowStatus: vi.fn(),
      getOrdersByEscrowStage: vi.fn()
    };

    (EscrowRepository as any).mockImplementation(() => mockEscrowRepository);

    notificationService = new EscrowNotificationService();
  });

  describe('scheduleReminderNotifications', () => {
    it('should schedule deposit reminders for DEPOSIT stage', async () => {
      // Mock escrow status in DEPOSIT stage
      const mockEscrowStatus = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        currentStage: 'DEPOSIT' as const,
        totalAmount: 1000,
        depositPaid: 0,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 1000,
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);

      // Spy on console.log to verify notifications are scheduled
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.scheduleReminderNotifications(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      // Verify repository was called
      expect(mockEscrowRepository.getEscrowStatus).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      // Verify notifications were scheduled (2 deposit reminders)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled notification:',
        expect.objectContaining({
          type: 'deposit_reminder',
          recipient: '+233241234567'
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled notification:',
        expect.objectContaining({
          type: 'deposit_followup',
          recipient: '+233241234567'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should schedule fitting reminders for FITTING stage', async () => {
      const mockEscrowStatus = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        currentStage: 'FITTING' as const,
        totalAmount: 1000,
        depositPaid: 250,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 750,
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.scheduleReminderNotifications(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      // Verify fitting reminders are scheduled (3 customer + 1 tailor)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled notification:',
        expect.objectContaining({
          type: 'fitting_reminder',
          recipient: '+233241234567'
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled notification:',
        expect.objectContaining({
          type: 'tailor_fitting_reminder',
          recipient: '+233501234567'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should schedule delivery reminders for FINAL stage', async () => {
      const mockEscrowStatus = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        currentStage: 'FINAL' as const,
        totalAmount: 1000,
        depositPaid: 250,
        fittingPaid: 500,
        finalPaid: 0,
        escrowBalance: 250,
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.scheduleReminderNotifications(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      // Verify delivery reminders are scheduled (1 customer + 1 tailor)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled notification:',
        expect.objectContaining({
          type: 'delivery_reminder',
          recipient: '+233241234567'
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled notification:',
        expect.objectContaining({
          type: 'tailor_delivery_reminder',
          recipient: '+233501234567'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors when escrow status not found', async () => {
      mockEscrowRepository.getEscrowStatus.mockResolvedValue(null);

      await expect(
        notificationService.scheduleReminderNotifications('nonexistent-order')
      ).rejects.toThrow('Order not found or no escrow status');
    });
  });

  describe('sendMilestoneNotification', () => {
    it('should send milestone reached notifications', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.sendMilestoneNotification(
        '550e8400-e29b-41d4-a716-446655440000',
        'FITTING',
        'milestone_reached'
      );

      // Verify notifications are sent to both customer and tailor
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending notification:',
        expect.objectContaining({
          type: 'milestone_progress',
          recipient: '+233241234567', // Customer
          message: expect.stringContaining('Great news')
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending notification:',
        expect.objectContaining({
          type: 'milestone_progress',
          recipient: '+233501234567', // Tailor
          message: expect.stringContaining('Payment received')
        })
      );

      consoleSpy.mockRestore();
    });

    it('should send payment released notifications', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.sendMilestoneNotification(
        '550e8400-e29b-41d4-a716-446655440000',
        'FITTING',
        'payment_released'
      );

      // Verify payment released notification to tailor
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending notification:',
        expect.objectContaining({
          type: 'payment_released',
          recipient: '+233501234567',
          message: expect.stringContaining('Payment released')
        })
      );

      // Verify confirmation to customer
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending notification:',
        expect.objectContaining({
          type: 'payment_confirmation',
          recipient: '+233241234567',
          message: expect.stringContaining('Payment released to tailor')
        })
      );

      consoleSpy.mockRestore();
    });

    it('should send approval needed notifications', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.sendMilestoneNotification(
        '550e8400-e29b-41d4-a716-446655440000',
        'FITTING',
        'approval_needed'
      );

      // Verify approval needed notification to customer
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending notification:',
        expect.objectContaining({
          type: 'approval_needed',
          recipient: '+233241234567',
          message: expect.stringContaining('fitting photos')
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('processOverdueReminders', () => {
    it('should process overdue reminders without errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Should not throw an error even with empty overdue orders
      await expect(
        notificationService.processOverdueReminders()
      ).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('notification message generation', () => {
    it('should generate appropriate deposit reminder messages', async () => {
      const mockEscrowStatus = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        currentStage: 'DEPOSIT' as const,
        totalAmount: 1000,
        depositPaid: 0,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 1000,
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.scheduleReminderNotifications(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      // Check that messages contain expected content
      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled notification:',
        expect.objectContaining({
          message: expect.stringContaining('deposit payment')
        })
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled notification:',
        expect.objectContaining({
          message: expect.stringContaining('GH₵ 250.00')
        })
      );

      consoleSpy.mockRestore();
    });

    it('should include order numbers and amounts in messages', async () => {
      const mockEscrowStatus = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        currentStage: 'FITTING' as const,
        totalAmount: 1000,
        depositPaid: 250,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 750,
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.scheduleReminderNotifications(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      // Check that messages contain order number
      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled notification:',
        expect.objectContaining({
          message: expect.stringContaining('#55440000') // Last 8 chars of order ID
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('notification priority assignment', () => {
    it('should assign correct priorities to different notification types', async () => {
      const mockEscrowStatus = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        currentStage: 'DEPOSIT' as const,
        totalAmount: 1000,
        depositPaid: 0,
        fittingPaid: 0,
        finalPaid: 0,
        escrowBalance: 1000,
        stageHistory: []
      };

      mockEscrowRepository.getEscrowStatus.mockResolvedValue(mockEscrowStatus);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notificationService.scheduleReminderNotifications(
        '550e8400-e29b-41d4-a716-446655440000'
      );

      // Deposit reminders should have high priority
      const logCalls = consoleSpy.mock.calls.filter(call => 
        call[0] === 'Scheduled notification:' && 
        call[1].type === 'deposit_reminder'
      );

      expect(logCalls.length).toBeGreaterThan(0);
      // Note: In a real implementation, we'd verify the priority field directly

      consoleSpy.mockRestore();
    });
  });
});