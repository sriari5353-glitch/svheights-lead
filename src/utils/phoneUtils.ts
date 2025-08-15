
/**
 * Utility functions for phone number handling with +91 country code
 */

export const INDIA_CODE = '+91';

/**
 * Normalize phone number by removing spaces, dashes, and other formatting
 */
export const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/[\s\-\(\)]/g, '');
};

/**
 * Check if phone number already has a country code
 */
export const hasCountryCode = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  return normalized.startsWith('+');
};

/**
 * Add +91 prefix if no country code exists
 */
export const addIndiaCode = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  
  if (hasCountryCode(normalized)) {
    return normalized;
  }
  
  // Remove leading zero if present (common in Indian mobile numbers)
  const cleanNumber = normalized.replace(/^0+/, '');
  
  return `${INDIA_CODE}${cleanNumber}`;
};

/**
 * Format phone number for display (+91 98765 43210)
 */
export const formatPhoneForDisplay = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.startsWith('+91') && normalized.length === 13) {
    const number = normalized.slice(3);
    return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
  }
  
  return phone;
};

/**
 * Extract phone number for WhatsApp (remove + and spaces)
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  return normalizePhoneNumber(phone).replace(/^\+/, '');
};

/**
 * Validate Indian mobile number format
 */
export const isValidIndianMobile = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  
  // Check if it starts with +91 and has 10 digits after
  if (normalized.startsWith('+91')) {
    const number = normalized.slice(3);
    return /^[6-9]\d{9}$/.test(number);
  }
  
  // Check if it's a 10-digit number starting with 6-9
  return /^[6-9]\d{9}$/.test(normalized);
};
