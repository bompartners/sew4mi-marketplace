import { describe, it, expect } from 'vitest';
import { 
  validateGhanaPhoneNumber,
  formatGhanaPhoneForDisplay,
  getNetworkProvider,
  isNetworkProvider,
  getNetworkPrefixes,
  isValidGhanaPrefix
} from '@sew4mi/shared/utils/phone-validation';

describe('Phone Validation Utilities', () => {
  describe('validateGhanaPhoneNumber', () => {
    describe('MTN numbers', () => {
      const mtnNumbers = [
        '+233241234567',
        '0241234567', 
        '241234567',
        '+233541234567',
        '0541234567',
        '541234567',
        '+233551234567',
        '+233591234567'
      ];

      mtnNumbers.forEach(number => {
        it(`should validate MTN number: ${number}`, () => {
          const result = validateGhanaPhoneNumber(number);
          expect(result.isValid).toBe(true);
          expect(result.network).toBe('MTN');
          expect(result.formattedNumber).toMatch(/^\+233(24|54|55|59)\d{7}$/);
        });
      });
    });

    describe('Vodafone numbers', () => {
      const vodafoneNumbers = [
        '+233201234567',
        '0201234567',
        '201234567',
        '+233501234567',
        '0501234567',
        '501234567'
      ];

      vodafoneNumbers.forEach(number => {
        it(`should validate Vodafone number: ${number}`, () => {
          const result = validateGhanaPhoneNumber(number);
          expect(result.isValid).toBe(true);
          expect(result.network).toBe('VODAFONE');
          expect(result.formattedNumber).toMatch(/^\+233(20|50)\d{7}$/);
        });
      });
    });

    describe('AirtelTigo numbers', () => {
      const airtelTigoNumbers = [
        '+233271234567',
        '0271234567',
        '271234567',
        '+233571234567',
        '0571234567',
        '571234567',
        '+233261234567',
        '+233561234567'
      ];

      airtelTigoNumbers.forEach(number => {
        it(`should validate AirtelTigo number: ${number}`, () => {
          const result = validateGhanaPhoneNumber(number);
          expect(result.isValid).toBe(true);
          expect(result.network).toBe('AIRTELTIGO');
          expect(result.formattedNumber).toMatch(/^\+233(27|57|26|56)\d{7}$/);
        });
      });
    });

    describe('invalid numbers', () => {
      const invalidNumbers = [
        '',                    // Empty string
        '123',                 // Too short
        '12345678901234567',   // Too long
        '+1234567890',         // Wrong country code
        '+233111234567',       // Invalid prefix
        'abcdefghij',          // Letters
        null,                  // Null
        undefined,             // Undefined
        123456789              // Number type
      ];

      invalidNumbers.forEach(number => {
        it(`should reject invalid number: ${number}`, () => {
          const result = validateGhanaPhoneNumber(number as any);
          expect(result.isValid).toBe(false);
          expect(result.network).toBeUndefined();
          expect(result.formattedNumber).toBeUndefined();
        });
      });
    });

    describe('formatting behavior', () => {
      it('should remove non-digit characters', () => {
        const formattedNumbers = [
          '+233-24-123-4567',
          '+233 24 123 4567',
          '(+233) 24 123 4567',
          '233.24.123.4567'
        ];

        formattedNumbers.forEach(number => {
          const result = validateGhanaPhoneNumber(number);
          expect(result.isValid).toBe(true);
          expect(result.formattedNumber).toBe('+233241234567');
        });
      });

      it('should handle different input formats consistently', () => {
        const variations = [
          '+233241234567',
          '233241234567', 
          '0241234567',
          '241234567'
        ];

        variations.forEach(number => {
          const result = validateGhanaPhoneNumber(number);
          expect(result.isValid).toBe(true);
          expect(result.formattedNumber).toBe('+233241234567');
          expect(result.network).toBe('MTN');
        });
      });
    });
  });

  describe('formatGhanaPhoneForDisplay', () => {
    it('should format valid numbers for display', () => {
      const testCases = [
        { input: '+233241234567', expected: '+233 24 123 4567' },
        { input: '0241234567', expected: '+233 24 123 4567' },
        { input: '+233201234567', expected: '+233 20 123 4567' },
        { input: '+233271234567', expected: '+233 27 123 4567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = formatGhanaPhoneForDisplay(input);
        expect(result).toBe(expected);
      });
    });

    it('should return original input for invalid numbers', () => {
      const invalidNumbers = ['123456', 'invalid', '+1234567890'];

      invalidNumbers.forEach(number => {
        const result = formatGhanaPhoneForDisplay(number);
        expect(result).toBe(number);
      });
    });
  });

  describe('getNetworkProvider', () => {
    it('should correctly identify network providers', () => {
      const testCases = [
        { number: '+233241234567', expected: 'MTN' },
        { number: '+233541234567', expected: 'MTN' },
        { number: '+233201234567', expected: 'VODAFONE' },
        { number: '+233501234567', expected: 'VODAFONE' },
        { number: '+233271234567', expected: 'AIRTELTIGO' },
        { number: '+233571234567', expected: 'AIRTELTIGO' },
        { number: 'invalid', expected: null }
      ];

      testCases.forEach(({ number, expected }) => {
        const result = getNetworkProvider(number);
        expect(result).toBe(expected);
      });
    });
  });

  describe('isNetworkProvider', () => {
    it('should correctly check if number belongs to specific network', () => {
      expect(isNetworkProvider('+233241234567', 'MTN')).toBe(true);
      expect(isNetworkProvider('+233241234567', 'VODAFONE')).toBe(false);
      expect(isNetworkProvider('+233201234567', 'VODAFONE')).toBe(true);
      expect(isNetworkProvider('+233201234567', 'MTN')).toBe(false);
      expect(isNetworkProvider('+233271234567', 'AIRTELTIGO')).toBe(true);
      expect(isNetworkProvider('+233271234567', 'MTN')).toBe(false);
      expect(isNetworkProvider('invalid', 'MTN')).toBe(false);
    });
  });

  describe('getNetworkPrefixes', () => {
    it('should return correct prefixes for each network', () => {
      expect(getNetworkPrefixes('MTN')).toEqual(['24', '54', '55', '59']);
      expect(getNetworkPrefixes('VODAFONE')).toEqual(['20', '50']);
      expect(getNetworkPrefixes('AIRTELTIGO')).toEqual(['27', '57', '26', '56']);
    });
  });

  describe('isValidGhanaPrefix', () => {
    it('should correctly identify valid Ghana prefixes', () => {
      const validPrefixes = ['24', '54', '55', '59', '20', '50', '27', '57', '26', '56'];
      const invalidPrefixes = ['23', '21', '30', '40', '10'];

      validPrefixes.forEach(prefix => {
        expect(isValidGhanaPrefix(prefix)).toBe(true);
      });

      invalidPrefixes.forEach(prefix => {
        expect(isValidGhanaPrefix(prefix)).toBe(false);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty and null inputs gracefully', () => {
      const emptyInputs = ['', null, undefined];

      emptyInputs.forEach(input => {
        expect(validateGhanaPhoneNumber(input as any).isValid).toBe(false);
        expect(getNetworkProvider(input as any)).toBeNull();
        expect(isNetworkProvider(input as any, 'MTN')).toBe(false);
      });
    });

    it('should handle numbers with unusual formatting', () => {
      const unusualFormats = [
        '00233241234567',    // Double country code
        '233-24-1234567',    // Mixed formatting
        'tel:+233241234567', // URI format
        '+233(24)1234567'    // Parentheses
      ];

      unusualFormats.forEach(number => {
        const result = validateGhanaPhoneNumber(number);
        // Some may be valid after cleanup, others not
        if (result.isValid) {
          expect(result.formattedNumber).toMatch(/^\+233\d{9}$/);
        }
      });
    });

    it('should handle boundary conditions', () => {
      const boundaryCases = [
        '+233240000000',    // Minimum valid number
        '+233599999999',    // Maximum valid MTN number
        '+233209999999',    // Maximum valid Vodafone number
        '+233579999999'     // Maximum valid AirtelTigo number
      ];

      boundaryCases.forEach(number => {
        const result = validateGhanaPhoneNumber(number);
        expect(result.isValid).toBe(true);
        expect(result.network).toBeDefined();
      });
    });
  });

  describe('performance and consistency', () => {
    it('should be consistent across multiple calls', () => {
      const testNumber = '+233241234567';
      
      for (let i = 0; i < 100; i++) {
        const result = validateGhanaPhoneNumber(testNumber);
        expect(result.isValid).toBe(true);
        expect(result.network).toBe('MTN');
        expect(result.formattedNumber).toBe('+233241234567');
      }
    });

    it('should handle large batch of numbers efficiently', () => {
      const numbers = Array(1000).fill(null).map((_, i) => 
        `+23324${String(i).padStart(7, '0')}`
      );

      const startTime = Date.now();
      numbers.forEach(number => {
        validateGhanaPhoneNumber(number);
      });
      const endTime = Date.now();

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
    });
  });
});