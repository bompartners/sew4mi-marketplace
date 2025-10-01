import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserRepository } from '../../../../lib/repositories/userRepository'
// import { createClient } from '@supabase/supabase-js' // Removed unused import

vi.mock('@supabase/supabase-js')

describe('UserRepository', () => {
  let repository: UserRepository
  let mockClient: any

  beforeEach(() => {
    mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    }

    mockClient.from.mockReturnValue(mockClient)
    repository = new UserRepository(mockClient as any)
  })

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'CUSTOMER',
      }

      mockClient.single.mockResolvedValue({ data: mockUser, error: null })

      const result = await repository.findByEmail('test@example.com')

      expect(mockClient.from).toHaveBeenCalledWith('users')
      expect(mockClient.eq).toHaveBeenCalledWith('email', 'test@example.com')
      expect(result).toEqual(mockUser)
    })

    it('should return null when user not found', async () => {
      mockClient.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      })

      const result = await repository.findByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })
  })

  describe('findByPhone', () => {
    it('should find user by phone number', async () => {
      const mockUser = {
        id: 'user-123',
        phone_number: '+233240123456',
        full_name: 'Test User',
        role: 'CUSTOMER',
      }

      mockClient.single.mockResolvedValue({ data: mockUser, error: null })

      const result = await repository.findByPhone('+233240123456')

      expect(mockClient.from).toHaveBeenCalledWith('users')
      expect(mockClient.eq).toHaveBeenCalledWith('phone_number', '+233240123456')
      expect(result).toEqual(mockUser)
    })
  })

  describe('findByRole', () => {
    it('should find users by role', async () => {
      const mockUsers = [
        { id: 'tailor-1', role: 'TAILOR', full_name: 'Tailor 1' },
        { id: 'tailor-2', role: 'TAILOR', full_name: 'Tailor 2' },
      ]

      mockClient.order.mockResolvedValue({ data: mockUsers, error: null })

      const result = await repository.findByRole('TAILOR')

      expect(mockClient.from).toHaveBeenCalledWith('users')
      expect(mockClient.eq).toHaveBeenCalledWith('role', 'TAILOR')
      expect(mockClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockUsers)
    })
  })

  describe('updateWhatsAppOptIn', () => {
    it('should update WhatsApp opt-in status', async () => {
      const updatedUser = {
        id: 'user-123',
        whatsapp_opted_in: true,
        whatsapp_number: '+233240123456',
      }

      mockClient.single.mockResolvedValue({ data: updatedUser, error: null })

      const result = await repository.updateWhatsAppOptIn('user-123', true, '+233240123456')

      expect(mockClient.update).toHaveBeenCalledWith({
        whatsapp_opted_in: true,
        whatsapp_number: '+233240123456',
      })
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'user-123')
      expect(result).toEqual(updatedUser)
    })
  })

  describe('verifyPhone', () => {
    it('should verify user phone number', async () => {
      const verifiedUser = {
        id: 'user-123',
        phone_verified: true,
      }

      mockClient.single.mockResolvedValue({ data: verifiedUser, error: null })

      const result = await repository.verifyPhone('user-123')

      expect(mockClient.update).toHaveBeenCalledWith({ phone_verified: true })
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'user-123')
      expect(result).toEqual(verifiedUser)
    })
  })

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      mockClient.eq.mockResolvedValue({ data: null, error: null })

      await repository.softDelete('user-123')

      expect(mockClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
        })
      )
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'user-123')
    })
  })

  describe('findActive', () => {
    it('should find active users', async () => {
      const activeUsers = [
        { id: 'user-1', deleted_at: null },
        { id: 'user-2', deleted_at: null },
      ]

      mockClient.order.mockResolvedValue({ data: activeUsers, error: null })

      const result = await repository.findActive()

      expect(mockClient.is).toHaveBeenCalledWith('deleted_at', null)
      expect(mockClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(activeUsers)
    })
  })
})