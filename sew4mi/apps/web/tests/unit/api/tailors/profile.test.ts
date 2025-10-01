import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/tailors/[id]/profile/route';
import { tailorProfileService } from '@/lib/services/tailor-profile.service';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/services/tailor-profile.service', () => ({
  tailorProfileService: {
    getCompleteProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const mockTailorProfile = {
  id: 'tailor-1',
  userId: 'user-1',
  businessName: 'Test Tailor',
  bio: 'Expert tailor specializing in traditional wear',
  profilePhoto: 'https://example.com/photo.jpg',
  specializations: ['Kaba & Slit', 'Traditional Wear'],
  rating: 4.5,
  totalReviews: 15,
  totalOrders: 25,
  completedOrders: 23,
  verificationStatus: 'VERIFIED' as const,
  city: 'Accra',
  region: 'Greater Accra',
  bankAccountDetails: { accountNumber: '123456789' },
  mobileMoneyDetails: { phoneNumber: '0241234567' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('Tailor Profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tailors/[id]/profile', () => {
    it('should return tailor profile for authenticated user who owns the profile', async () => {
      // Mock authenticated user who owns the profile
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } }
          })
        }
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(tailorProfileService.getCompleteProfile).mockResolvedValue(mockTailorProfile as any);

      const request = new NextRequest('http://localhost:3000/api/tailors/tailor-1/profile');
      const params = Promise.resolve({ id: 'tailor-1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTailorProfile);
      expect(data.data.bankAccountDetails).toBeDefined(); // Should include sensitive data for owner
    });

    it('should return tailor profile without sensitive data for public viewing', async () => {
      // Mock unauthenticated user
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null }
          })
        }
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(tailorProfileService.getCompleteProfile).mockResolvedValue(mockTailorProfile as any);

      const request = new NextRequest('http://localhost:3000/api/tailors/tailor-1/profile');
      const params = Promise.resolve({ id: 'tailor-1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.bankAccountDetails).toBeUndefined(); // Should hide sensitive data
      expect(data.data.mobileMoneyDetails).toBeUndefined();
    });

    it('should return 404 if tailor profile not found', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } }
          })
        }
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(tailorProfileService.getCompleteProfile).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/tailors/non-existent/profile');
      const params = Promise.resolve({ id: 'non-existent' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Tailor profile not found');
    });
  });

  describe('PUT /api/tailors/[id]/profile', () => {
    it('should update tailor profile for authenticated owner', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } }
          })
        }
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const updates = {
        businessName: 'Updated Tailor Name',
        bio: 'Updated bio',
      };

      const updatedProfile = { ...mockTailorProfile, ...updates };
      vi.mocked(tailorProfileService.updateProfile).mockResolvedValue(updatedProfile as any);

      const request = new NextRequest('http://localhost:3000/api/tailors/tailor-1/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' }
      });
      const params = Promise.resolve({ id: 'tailor-1' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.businessName).toBe('Updated Tailor Name');
      expect(tailorProfileService.updateProfile).toHaveBeenCalledWith('user-1', 'tailor-1', updates);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null }
          })
        }
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/tailors/tailor-1/profile', {
        method: 'PUT',
        body: JSON.stringify({ businessName: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' }
      });
      const params = Promise.resolve({ id: 'tailor-1' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 for unauthorized user', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'different-user' } }
          })
        }
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(tailorProfileService.updateProfile).mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost:3000/api/tailors/tailor-1/profile', {
        method: 'PUT',
        body: JSON.stringify({ businessName: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' }
      });
      const params = Promise.resolve({ id: 'tailor-1' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized to update this profile');
    });
  });
});