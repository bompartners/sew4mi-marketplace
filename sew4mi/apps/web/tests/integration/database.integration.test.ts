import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@sew4mi/shared/types/database'
import { UserRepository } from '../../lib/repositories/userRepository'
import { TailorRepository } from '../../lib/repositories/tailorRepository'
import { OrderRepository } from '../../lib/repositories/orderRepository'

describe('Database Integration Tests', () => {
  let supabaseClient: ReturnType<typeof createClient<Database>> | null = null
  let userRepository: UserRepository
  let tailorRepository: TailorRepository
  let orderRepository: OrderRepository

  const testUserId = `test-user-${Date.now()}`
  const testTailorId = `test-tailor-${Date.now()}`
  const testOrderId = `test-order-${Date.now()}`

  beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping integration tests: Missing Supabase environment variables')
      return
    }

    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
    userRepository = new UserRepository(supabaseClient)
    tailorRepository = new TailorRepository(supabaseClient)
    orderRepository = new OrderRepository(supabaseClient)

    // Verify connection
    const { error } = await supabaseClient.from('users').select('count').limit(1)
    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`)
    }
  })

  afterAll(async () => {
    // Clean up test data
    if (supabaseClient) {
      try {
        await Promise.allSettled([
          supabaseClient.from('orders').delete().like('id', 'test-order-%'),
          supabaseClient.from('tailor_profiles').delete().like('id', 'test-tailor-%'),
          supabaseClient.from('users').delete().like('id', 'test-user-%')
        ])
      } catch (error) {
        console.warn('Cleanup failed:', error)
      }
    }
  })

  describe('User Repository Integration', () => {
    const testUser = {
      id: testUserId,
      email: `test-${Date.now()}@example.com`,
      full_name: 'Test User',
      phone_number: `+233${Date.now().toString().slice(-9)}`,
      role: 'CUSTOMER' as const,
      phone_verified: false,
      whatsapp_opted_in: false
    }

    beforeEach(async () => {
      if (!supabaseClient) return
      // Clean up any existing test user
      await supabaseClient.from('users').delete().eq('id', testUserId)
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should create and retrieve a user', async () => {
      if (!supabaseClient) return
      
      const createdUser = await userRepository.create(testUser)
      
      expect(createdUser.id).toBe(testUserId)
      expect(createdUser.email).toBe(testUser.email)
      expect(createdUser.role).toBe('CUSTOMER')

      const retrievedUser = await userRepository.findById(testUserId)
      expect(retrievedUser).toEqual(createdUser)
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should find user by email', async () => {
      if (!supabaseClient) return
      
      await userRepository.create(testUser)
      
      const foundUser = await userRepository.findByEmail(testUser.email)
      expect(foundUser).toBeTruthy()
      expect(foundUser?.email).toBe(testUser.email)
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should find user by phone', async () => {
      if (!supabaseClient) return
      
      await userRepository.create(testUser)
      
      const foundUser = await userRepository.findByPhone(testUser.phone_number)
      expect(foundUser).toBeTruthy()
      expect(foundUser?.phone_number).toBe(testUser.phone_number)
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should update WhatsApp opt-in status', async () => {
      if (!supabaseClient) return
      
      const createdUser = await userRepository.create(testUser)
      
      const updatedUser = await userRepository.updateWhatsAppOptIn(
        createdUser.id,
        true,
        '+233240123456'
      )

      expect(updatedUser.whatsapp_opted_in).toBe(true)
      expect(updatedUser.whatsapp_number).toBe('+233240123456')
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should verify phone number', async () => {
      if (!supabaseClient) return
      
      const createdUser = await userRepository.create(testUser)
      
      const verifiedUser = await userRepository.verifyPhone(createdUser.id)
      
      expect(verifiedUser.phone_verified).toBe(true)
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should soft delete user', async () => {
      if (!supabaseClient) return
      
      const createdUser = await userRepository.create(testUser)
      
      await userRepository.softDelete(createdUser.id)
      
      const activeUsers = await userRepository.findActive()
      const deletedUserExists = activeUsers.some(u => u.id === createdUser.id)
      expect(deletedUserExists).toBe(false)
    })
  })

  describe('Connection Resilience', () => {
    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should handle connection timeout gracefully', async () => {
      if (!supabaseClient) return
      
      const shortTimeoutClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            fetch: (url, options) => {
              return Promise.race([
                fetch(url, options),
                new Promise<Response>((_, reject) =>
                  setTimeout(() => reject(new Error('Connection timeout')), 100)
                )
              ])
            }
          }
        }
      )

      const timeoutRepository = new UserRepository(shortTimeoutClient)
      
      await expect(timeoutRepository.findAll()).rejects.toThrow()
    }, 10000)

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should handle invalid database credentials', async () => {
      const invalidClient = createClient<Database>(
        'https://invalid-project.supabase.co',
        'invalid-key'
      )

      const invalidRepository = new UserRepository(invalidClient)
      
      await expect(invalidRepository.findAll()).rejects.toThrow()
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should handle network disconnection scenarios', async () => {
      // Simulate network failure by using invalid URL
      const disconnectedClient = createClient<Database>(
        'https://127.0.0.1:9999',
        'fake-key'
      )

      const disconnectedRepository = new UserRepository(disconnectedClient)
      
      await expect(disconnectedRepository.findAll()).rejects.toThrow()
    })
  })

  describe('Database Performance', () => {
    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should handle concurrent operations', async () => {
      if (!supabaseClient) return
      
      const promises = Array.from({ length: 5 }, (_, i) => 
        userRepository.create({
          id: `concurrent-user-${i}-${Date.now()}`,
          email: `concurrent-${i}-${Date.now()}@example.com`,
          full_name: `Concurrent User ${i}`,
          role: 'CUSTOMER' as const,
          phone_verified: false,
          whatsapp_opted_in: false
        })
      )

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(5)
      results.forEach(user => {
        expect(user.id).toBeDefined()
        expect(user.email).toContain('concurrent-')
      })

      // Cleanup
      await Promise.all(
        results.map(user => 
          supabaseClient!.from('users').delete().eq('id', user.id)
        )
      )
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should handle large result sets efficiently', async () => {
      if (!supabaseClient) return
      
      const startTime = Date.now()
      
      // This tests pagination and query performance
      const users = await userRepository.findAll({ limit: 50 })
      
      const endTime = Date.now()
      const queryTime = endTime - startTime
      
      // Query should complete within reasonable time (5 seconds)
      expect(queryTime).toBeLessThan(5000)
      expect(Array.isArray(users)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should handle duplicate key violations', async () => {
      if (!supabaseClient) return
      
      const duplicateUser = {
        id: `duplicate-${Date.now()}`,
        email: `duplicate-${Date.now()}@example.com`,
        full_name: 'Duplicate User',
        role: 'CUSTOMER' as const,
        phone_verified: false,
        whatsapp_opted_in: false
      }

      await userRepository.create(duplicateUser)
      
      // Try to create same user again
      await expect(userRepository.create(duplicateUser)).rejects.toThrow()

      // Cleanup
      await userRepository.delete(duplicateUser.id)
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should handle foreign key violations', async () => {
      if (!supabaseClient) return
      
      // Try to create tailor profile without valid user
      await expect(tailorRepository.create({
        id: `invalid-tailor-${Date.now()}`,
        user_id: 'non-existent-user-id',
        business_name: 'Invalid Tailor',
        city: 'Accra',
        region: 'Greater Accra',
        experience_years: 5,
        verification_status: 'PENDING' as const,
        vacation_mode: false,
        rating: 0,
        total_reviews: 0,
        total_orders: 0,
        specializations: ['TRADITIONAL']
      })).rejects.toThrow()
    })

    it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('should handle malformed queries gracefully', async () => {
      if (!supabaseClient) return
      
      // Test with invalid filter parameters
      await expect(
        userRepository.findAll({ orderBy: 'non_existent_column' })
      ).rejects.toThrow()
    })
  })
})