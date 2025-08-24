import { GHANA_PHONE_PREFIXES } from '../constants/payment';
import { GhanaPhoneValidation } from '../types/payment';

/**
 * Validates and formats Ghana phone numbers
 * Supports formats: +233XXXXXXXX, 0XXXXXXXX, XXXXXXXX
 */
export function validateGhanaPhoneNumber(phoneNumber: string): GhanaPhoneValidation {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { isValid: false };
  }

  // Remove all non-digits and normalize
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different formats: +233XXXXXXXX, 0XXXXXXXX, XXXXXXXX
  let normalized: string;
  if (cleaned.startsWith('233')) {
    normalized = cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    normalized = `233${cleaned.substring(1)}`;
  } else if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    normalized = `233${cleaned}`;
  } else {
    return { isValid: false };
  }

  // Validate length (233 + 9 digits = 12 total)
  if (normalized.length !== 12) {
    return { isValid: false };
  }

  // Extract prefix (first 2 digits after country code)
  const prefix = normalized.substring(3, 5);
  let network: 'MTN' | 'VODAFONE' | 'AIRTELTIGO' | undefined;

  // Determine network based on prefix
  if (GHANA_PHONE_PREFIXES.MTN.includes(prefix)) {
    network = 'MTN';
  } else if (GHANA_PHONE_PREFIXES.VODAFONE.includes(prefix)) {
    network = 'VODAFONE';
  } else if (GHANA_PHONE_PREFIXES.AIRTELTIGO.includes(prefix)) {
    network = 'AIRTELTIGO';
  }

  if (!network) {
    return { isValid: false };
  }

  return {
    isValid: true,
    network,
    formattedNumber: `+${normalized}`
  };
}

/**
 * Format phone number for display
 */
export function formatGhanaPhoneForDisplay(phoneNumber: string): string {
  const validation = validateGhanaPhoneNumber(phoneNumber);
  
  if (!validation.isValid || !validation.formattedNumber) {
    return phoneNumber;
  }

  // Format as +233 XX XXX XXXX
  const number = validation.formattedNumber;
  return `${number.substring(0, 4)} ${number.substring(4, 6)} ${number.substring(6, 9)} ${number.substring(9)}`;
}

/**
 * Get network provider from phone number
 */
export function getNetworkProvider(phoneNumber: string): 'MTN' | 'VODAFONE' | 'AIRTELTIGO' | null {
  const validation = validateGhanaPhoneNumber(phoneNumber);
  return validation.isValid ? validation.network || null : null;
}

/**
 * Check if phone number belongs to specific network
 */
export function isNetworkProvider(phoneNumber: string, network: 'MTN' | 'VODAFONE' | 'AIRTELTIGO'): boolean {
  const detectedNetwork = getNetworkProvider(phoneNumber);
  return detectedNetwork === network;
}

/**
 * Get all valid prefixes for a network
 */
export function getNetworkPrefixes(network: 'MTN' | 'VODAFONE' | 'AIRTELTIGO'): readonly string[] {
  return GHANA_PHONE_PREFIXES[network] || [];
}

/**
 * Check if a prefix is valid for any network
 */
export function isValidGhanaPrefix(prefix: string): boolean {
  return Object.values(GHANA_PHONE_PREFIXES).some(prefixes => 
    prefixes.includes(prefix)
  );
}