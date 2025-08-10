import { describe, it, expect } from 'vitest';

describe('Example Unit Test', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const message = 'Hello, Sew4Mi!';
    expect(message).toContain('Sew4Mi');
    expect(message.toLowerCase()).toBe('hello, sew4mi!');
  });
});
