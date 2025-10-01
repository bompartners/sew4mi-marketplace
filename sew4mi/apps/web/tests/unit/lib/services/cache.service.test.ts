import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryCacheService, RedisCacheService, createCacheService } from '../../../../lib/services/cache.service';

// Mock ioredis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  flushdb: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => mockRedis),
}));

describe('InMemoryCacheService', () => {
  let cache: InMemoryCacheService;

  beforeEach(() => {
    cache = new InMemoryCacheService();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('get and set operations', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = { data: 'test-data', number: 42 };

      await cache.set(key, value, 60);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should expire values after TTL', async () => {
      const key = 'expire-test';
      const value = { data: 'expire-me' };

      await cache.set(key, value, 0.001); // 1ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cache.get(key);
      expect(result).toBeNull();
    });

    it('should handle string values', async () => {
      await cache.set('string-key', 'string-value', 60);
      const result = await cache.get('string-key');
      expect(result).toBe('string-value');
    });

    it('should handle array values', async () => {
      const arrayValue = [1, 2, 3, 'test'];
      await cache.set('array-key', arrayValue, 60);
      const result = await cache.get('array-key');
      expect(result).toEqual(arrayValue);
    });
  });

  describe('delete operations', () => {
    it('should delete specific keys', async () => {
      await cache.set('delete-test', 'to-be-deleted', 60);
      expect(await cache.get('delete-test')).toBe('to-be-deleted');

      await cache.delete('delete-test');
      expect(await cache.get('delete-test')).toBeNull();
    });

    it('should clear all cache entries', async () => {
      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);

      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('cache cleanup', () => {
    it('should clean expired entries automatically', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.005); // Force cleanup

      // Set an expired entry
      await cache.set('expired', 'old-data', 0.001);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Set a new entry to trigger cleanup
      await cache.set('fresh', 'new-data', 60);

      // Expired entry should be cleaned up
      expect(await cache.get('expired')).toBeNull();
      expect(await cache.get('fresh')).toBe('new-data');

      Math.random = originalRandom;
    });
  });
});

describe('RedisCacheService', () => {
  let cache: RedisCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new RedisCacheService();
  });

  afterEach(async () => {
    if (cache) {
      await cache.disconnect();
    }
  });

  describe('get operations', () => {
    it('should retrieve and parse JSON values', async () => {
      const value = { data: 'test', number: 42 };
      mockRedis.get.mockResolvedValue(JSON.stringify(value));

      const result = await cache.get('test-key');
      
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cache.get('non-existent');
      
      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cache.get('error-key');
      
      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid-json{');

      const result = await cache.get('invalid-json');
      
      expect(result).toBeNull();
    });
  });

  describe('set operations', () => {
    it('should store JSON-serialized values with TTL', async () => {
      const value = { data: 'test', number: 42 };
      mockRedis.setex.mockResolvedValue('OK');

      await cache.set('test-key', value, 300);
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key', 
        300, 
        JSON.stringify(value)
      );
    });

    it('should handle Redis set errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));

      // Should not throw
      await expect(cache.set('error-key', 'value', 60)).resolves.toBeUndefined();
    });
  });

  describe('delete operations', () => {
    it('should delete specific keys', async () => {
      mockRedis.del.mockResolvedValue(1);

      await cache.delete('delete-key');
      
      expect(mockRedis.del).toHaveBeenCalledWith('delete-key');
    });

    it('should clear all cache entries', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');

      await cache.clear();
      
      expect(mockRedis.flushdb).toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'));

      // Should not throw
      await expect(cache.delete('error-key')).resolves.toBeUndefined();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await cache.disconnect();
      
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});

describe('createCacheService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create InMemoryCacheService in development', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };

    const cache = createCacheService();
    
    expect(cache).toBeInstanceOf(InMemoryCacheService);
  });

  it('should create RedisCacheService in production', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };

    const cache = createCacheService();
    
    expect(cache).toBeInstanceOf(RedisCacheService);
  });

  it('should create RedisCacheService when USE_REDIS is true', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development', USE_REDIS: 'true' };

    const cache = createCacheService();
    
    expect(cache).toBeInstanceOf(RedisCacheService);
  });

  it('should create InMemoryCacheService by default', () => {
    // Temporarily modify process.env without delete
    const originalEnv = process.env;
    const testEnv = { ...originalEnv };
    testEnv.NODE_ENV = 'test';
    testEnv.USE_REDIS = undefined;
    
    // @ts-ignore - temporarily bypass readonly
    process.env = testEnv;

    const cache = createCacheService();
    
    // Restore original environment
    // @ts-ignore - temporarily bypass readonly  
    process.env = originalEnv;
    
    expect(cache).toBeInstanceOf(InMemoryCacheService);
  });
});