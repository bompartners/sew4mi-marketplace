/**
 * Performance tests for recommendation algorithm
 * Tests query performance under various data loads
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recommendationService } from '@/lib/services/recommendation-engine.service';
import type { OrderAnalytics } from '@sew4mi/shared/types';

// Mock data generators
function generateMockAnalytics(orderCount: number): OrderAnalytics {
  const garmentTypes: Record<string, number> = {};
  const tailors: Record<string, number> = {};
  const fabrics: Record<string, number> = {};
  const colors: Record<string, { count: number; seasonal: boolean }> = {};

  // Generate diverse data
  const garmentTypesList = ['Custom Suit', 'Dress', 'Kente', 'Shirt', 'Trousers', 'Kaftan', 'Blouse'];
  const fabricsList = ['Cotton', 'Silk', 'Wool', 'Linen', 'Polyester', 'Kente Fabric'];
  const colorsList = ['Blue', 'Black', 'White', 'Red', 'Green', 'Gold', 'Brown'];

  for (let i = 0; i < orderCount; i++) {
    const garmentType = garmentTypesList[i % garmentTypesList.length];
    const fabric = fabricsList[i % fabricsList.length];
    const color = colorsList[i % colorsList.length];
    const tailorId = `tailor-${(i % 20) + 1}`; // 20 different tailors

    garmentTypes[garmentType] = (garmentTypes[garmentType] || 0) + 1;
    tailors[tailorId] = (tailors[tailorId] || 0) + 1;
    fabrics[fabric] = (fabrics[fabric] || 0) + 1;
    colors[color] = {
      count: (colors[color]?.count || 0) + 1,
      seasonal: Math.random() > 0.5,
    };
  }

  return {
    totalOrders: orderCount,
    garmentTypes,
    tailors,
    fabrics,
    colors,
    averageOrderValue: 300 + Math.random() * 200,
    lastOrderDate: new Date().toISOString(),
  };
}

describe('Recommendation Algorithm Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Garment Recommendation Performance', () => {
    it('should calculate garment recommendations in <10ms for small dataset (10 orders)', () => {
      const analytics = generateMockAnalytics(10);
      const garmentTypes = Object.keys(analytics.garmentTypes);

      const startTime = performance.now();

      for (const garmentType of garmentTypes) {
        recommendationService.calculateGarmentScore(garmentType, analytics);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10);
      console.log(`Small dataset (10 orders): ${duration.toFixed(2)}ms`);
    });

    it('should calculate garment recommendations in <50ms for medium dataset (100 orders)', () => {
      const analytics = generateMockAnalytics(100);
      const garmentTypes = Object.keys(analytics.garmentTypes);

      const startTime = performance.now();

      for (const garmentType of garmentTypes) {
        recommendationService.calculateGarmentScore(garmentType, analytics);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50);
      console.log(`Medium dataset (100 orders): ${duration.toFixed(2)}ms`);
    });

    it('should calculate garment recommendations in <200ms for large dataset (1000 orders)', () => {
      const analytics = generateMockAnalytics(1000);
      const garmentTypes = Object.keys(analytics.garmentTypes);

      const startTime = performance.now();

      for (const garmentType of garmentTypes) {
        recommendationService.calculateGarmentScore(garmentType, analytics);
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
        recommendationService.calculateGarmentScore(garmentType, analytics);
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
      const tailorIds = Object.keys(analytics.tailors);

      const startTime = performance.now();

      const rankings = tailorIds.map(tailorId => ({
        tailorId,
        score: recommendationService.calculateTailorScore(tailorId, analytics),
      })).sort((a, b) => b.score - a.score);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(20);
      expect(rankings.length).toBe(tailorIds.length);
      console.log(`Tailor ranking (20 tailors): ${duration.toFixed(2)}ms`);
    });

    it('should handle large tailor dataset (100 tailors) in <100ms', () => {
      // Generate analytics with 100 different tailors
      const analytics = generateMockAnalytics(500);
      const tailorCount = 100;
      const tailorIds = Array.from({ length: tailorCount }, (_, i) => `tailor-${i + 1}`);

      // Add tailors to analytics
      tailorIds.forEach(id => {
        analytics.tailors[id] = Math.floor(Math.random() * 10) + 1;
      });

      const startTime = performance.now();

      const rankings = tailorIds.map(tailorId => ({
        tailorId,
        score: recommendationService.calculateTailorScore(tailorId, analytics),
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
      const fabrics = Object.keys(analytics.fabrics);

      const startTime = performance.now();

      for (const fabric of fabrics) {
        recommendationService.calculateFabricScore(fabric, analytics);
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
      const garmentRecs = Object.keys(analytics.garmentTypes)
        .map(type => ({
          type,
          score: recommendationService.calculateGarmentScore(type, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const tailorRecs = Object.keys(analytics.tailors)
        .map(id => ({
          id,
          score: recommendationService.calculateTailorScore(id, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const fabricRecs = Object.keys(analytics.fabrics)
        .map(fabric => ({
          fabric,
          score: recommendationService.calculateFabricScore(fabric, analytics),
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

      const garmentRecs = Object.keys(analytics.garmentTypes)
        .map(type => ({
          type,
          score: recommendationService.calculateGarmentScore(type, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const tailorRecs = Object.keys(analytics.tailors)
        .map(id => ({
          id,
          score: recommendationService.calculateTailorScore(id, analytics),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const fabricRecs = Object.keys(analytics.fabrics)
        .map(fabric => ({
          fabric,
          score: recommendationService.calculateFabricScore(fabric, analytics),
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

        Object.keys(analytics.garmentTypes).forEach(type => {
          recommendationService.calculateGarmentScore(type, analytics);
        });

        Object.keys(analytics.tailors).forEach(id => {
          recommendationService.calculateTailorScore(id, analytics);
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
        totalOrders: 0,
        garmentTypes: {},
        tailors: {},
        fabrics: {},
        colors: {},
        averageOrderValue: 0,
        lastOrderDate: new Date().toISOString(),
      };

      const startTime = performance.now();
      recommendationService.calculateGarmentScore('Custom Suit', analytics);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1);
    });

    it('should handle single order analytics quickly', () => {
      const analytics = generateMockAnalytics(1);

      const startTime = performance.now();
      Object.keys(analytics.garmentTypes).forEach(type => {
        recommendationService.calculateGarmentScore(type, analytics);
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5);
    });
  });
});
