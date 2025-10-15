/**
 * Performance tests for recommendation algorithm
 * Tests query performance under various data loads
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recommendationEngineService as recommendationService } from '@/lib/services/recommendation-engine.service';
import type { OrderAnalytics } from '@sew4mi/shared/types';

// Mock data generators
function generateMockAnalytics(orderCount: number): OrderAnalytics {
  const garmentTypeFrequency: Record<string, number> = {};
  const preferredTailorsSet = new Set<string>();
  const fabricPreferences: Record<string, number> = {};
  const colorPreferences: Record<string, number> = {};
  const seasonalPatterns: Record<string, string[]> = {
    spring: [],
    summer: [],
    fall: [],
    winter: [],
  };

  // Generate diverse data
  const garmentTypesList = ['Custom Suit', 'Dress', 'Kente', 'Shirt', 'Trousers', 'Kaftan', 'Blouse'];
  const fabricsList = ['Cotton', 'Silk', 'Wool', 'Linen', 'Polyester', 'Kente Fabric'];
  const colorsList = ['Blue', 'Black', 'White', 'Red', 'Green', 'Gold', 'Brown'];

  for (let i = 0; i < orderCount; i++) {
    const garmentType = garmentTypesList[i % garmentTypesList.length];
    const fabric = fabricsList[i % fabricsList.length];
    const color = colorsList[i % colorsList.length];
    const tailorId = `tailor-${(i % 20) + 1}`; // 20 different tailors

    garmentTypeFrequency[garmentType] = (garmentTypeFrequency[garmentType] || 0) + 1;
    preferredTailorsSet.add(tailorId);
    fabricPreferences[fabric] = (fabricPreferences[fabric] || 0) + 1;
    colorPreferences[color] = (colorPreferences[color] || 0) + 1;

    // Add to seasonal patterns
    const seasons = ['spring', 'summer', 'fall', 'winter'];
    const season = seasons[i % seasons.length];
    if (!seasonalPatterns[season].includes(garmentType)) {
      seasonalPatterns[season].push(garmentType);
    }
  }

  return {
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    garmentTypeFrequency,
    fabricPreferences,
    colorPreferences,
    avgOrderValue: 300 + Math.random() * 200,
    preferredTailors: Array.from(preferredTailorsSet),
    seasonalPatterns,
    lastUpdated: new Date(),
  };
}

describe('Recommendation Algorithm Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Garment Recommendation Performance', () => {
    it('should calculate garment recommendations in <10ms for small dataset (10 orders)', () => {
      const analytics = generateMockAnalytics(10);
      const garmentTypes = Object.keys(analytics.garmentTypeFrequency);

      const startTime = performance.now();

      for (const garmentType of garmentTypes) {
        recommendationService['calculateGarmentScore'](garmentType, analytics);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10);
      console.log(`Small dataset (10 orders): ${duration.toFixed(2)}ms`);
    });

    it('should calculate garment recommendations in <50ms for medium dataset (100 orders)', () => {
      const analytics = generateMockAnalytics(100);
      const garmentTypes = Object.keys(analytics.garmentTypeFrequency);

      const startTime = performance.now();

      for (const garmentType of garmentTypes) {
        recommendationService['calculateGarmentScore'](garmentType, analytics);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50);
      console.log(`Medium dataset (100 orders): ${duration.toFixed(2)}ms`);
    });

    it('should calculate garment recommendations in <200ms for large dataset (1000 orders)', () => {
      const analytics = generateMockAnalytics(1000);
      const garmentTypes = Object.keys(analytics.garmentTypeFrequency);

      const startTime = performance.now();

      for (const garmentType of garmentTypes) {
        recommendationService['calculateGarmentScore'](garmentType, analytics);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200);
      console.log(`Large dataset (1000 orders): ${duration.toFixed(2)}ms`);
    });

    it('should maintain consistent performance with repeated calculations', () => {
      const analytics = generateMockAnalytics(100);
      const garmentType = 'Custom Suit';
      const iterations = 100;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        recommendationService['calculateGarmentScore'](garmentType, analytics);
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(avgDuration).toBeLessThan(1); // Average < 1ms
      expect(maxDuration - minDuration).toBeLessThan(5); // Variance < 5ms

      console.log(`Average: ${avgDuration.toFixed(3)}ms, Min: ${minDuration.toFixed(3)}ms, Max: ${maxDuration.toFixed(3)}ms`);
    });
  });

  describe('Tailor Recommendation Performance', () => {
    it('should rank tailors in <20ms for 20 tailors', () => {
      const analytics = generateMockAnalytics(100);
      const tailorCount = 20;

      // Create mock tailor objects
      const mockTailors = Array.from({ length: tailorCount }, (_, i) => ({
        id: `tailor-${i + 1}`,
        specializations: ['Custom Suit', 'Dress'],
        rating: 4.0 + Math.random(),
        base_price: 200 + Math.random() * 300,
      }));

      const startTime = performance.now();

      const rankings = mockTailors.map(tailor => ({
        tailorId: tailor.id,
        score: recommendationService['calculateTailorScore'](tailor, analytics),
      })).sort((a, b) => b.score - a.score);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(20);
      expect(rankings.length).toBe(tailorCount);
      console.log(`Tailor ranking (20 tailors): ${duration.toFixed(2)}ms`);
    });

    it('should handle large tailor dataset (100 tailors) in <100ms', () => {
      const analytics = generateMockAnalytics(500);
      const tailorCount = 100;

      // Create mock tailor objects
      const mockTailors = Array.from({ length: tailorCount }, (_, i) => ({
        id: `tailor-${i + 1}`,
        specializations: ['Custom Suit', 'Dress', 'Shirt'],
        rating: 3.5 + Math.random() * 1.5,
        base_price: 150 + Math.random() * 400,
      }));

      const startTime = performance.now();

      const rankings = mockTailors.map(tailor => ({
        tailorId: tailor.id,
        score: recommendationService['calculateTailorScore'](tailor, analytics),
      })).sort((a, b) => b.score - a.score);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
      expect(rankings.length).toBe(tailorCount);
      console.log(`Tailor ranking (100 tailors): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Fabric Recommendation Performance', () => {
    it('should calculate fabric scores in <15ms for typical dataset', () => {
      const analytics = generateMockAnalytics(100);
      const fabrics = Object.keys(analytics.fabricPreferences);

      const startTime = performance.now();

      for (const fabric of fabrics) {
        recommendationService['calculateFabricScore'](fabric, analytics);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(15);
      console.log(`Fabric scoring (${fabrics.length} fabrics): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Full Recommendation Pipeline Performance', () => {
    it('should generate complete recommendations in <100ms for typical user', () => {
      const analytics = generateMockAnalytics(50); // Average user with 50 orders

      const startTime = performance.now();

      // Simulate full recommendation generation
      const garmentRecs = Object.keys(analytics.garmentTypeFrequency)
        .map(type => ({
          type,
          score: recommendationService['calculateGarmentScore'](type, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // Create mock tailors for scoring
      const mockTailors = analytics.preferredTailors.slice(0, 10).map(id => ({
        id,
        specializations: ['Custom Suit', 'Dress'],
        rating: 4.0 + Math.random(),
        base_price: 250 + Math.random() * 200,
      }));

      const tailorRecs = mockTailors
        .map(tailor => ({
          id: tailor.id,
          score: recommendationService['calculateTailorScore'](tailor, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const fabricRecs = Object.keys(analytics.fabricPreferences)
        .map(fabric => ({
          fabric,
          score: recommendationService['calculateFabricScore'](fabric, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
      expect(garmentRecs.length).toBeGreaterThan(0);
      expect(tailorRecs.length).toBeGreaterThan(0);
      expect(fabricRecs.length).toBeGreaterThan(0);

      console.log(`Full recommendation pipeline: ${duration.toFixed(2)}ms`);
      console.log(`  - Garments: ${garmentRecs.length}, Tailors: ${tailorRecs.length}, Fabrics: ${fabricRecs.length}`);
    });

    it('should handle power user dataset (500 orders) in <500ms', () => {
      const analytics = generateMockAnalytics(500); // Power user

      const startTime = performance.now();

      const garmentRecs = Object.keys(analytics.garmentTypeFrequency)
        .map(type => ({
          type,
          score: recommendationService['calculateGarmentScore'](type, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // Create mock tailors for scoring
      const mockTailors = analytics.preferredTailors.slice(0, 10).map(id => ({
        id,
        specializations: ['Custom Suit', 'Dress', 'Shirt'],
        rating: 3.8 + Math.random() * 1.2,
        base_price: 200 + Math.random() * 300,
      }));

      const tailorRecs = mockTailors
        .map(tailor => ({
          id: tailor.id,
          score: recommendationService['calculateTailorScore'](tailor, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const fabricRecs = Object.keys(analytics.fabricPreferences)
        .map(fabric => ({
          fabric,
          score: recommendationService['calculateFabricScore'](fabric, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500);
      console.log(`Power user pipeline (500 orders): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory issues with large datasets', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate and process multiple large datasets
      for (let i = 0; i < 10; i++) {
        const analytics = generateMockAnalytics(1000);

        Object.keys(analytics.garmentTypeFrequency).forEach(type => {
          recommendationService['calculateGarmentScore'](type, analytics);
        });

        Object.keys(analytics.fabricPreferences).forEach(fabric => {
          recommendationService['calculateFabricScore'](fabric, analytics);
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
    });
  });

  describe('Edge Cases Performance', () => {
    it('should handle empty analytics quickly', () => {
      const analytics: OrderAnalytics = {
        userId: 'user-test',
        garmentTypeFrequency: {},
        fabricPreferences: {},
        colorPreferences: {},
        avgOrderValue: 0,
        preferredTailors: [],
        seasonalPatterns: {},
        lastUpdated: new Date(),
      };

      const startTime = performance.now();
      recommendationService['calculateGarmentScore']('Custom Suit', analytics);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1);
    });

    it('should handle single order analytics quickly', () => {
      const analytics = generateMockAnalytics(1);

      const startTime = performance.now();
      Object.keys(analytics.garmentTypeFrequency).forEach(type => {
        recommendationService['calculateGarmentScore'](type, analytics);
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5);
    });
  });
});
