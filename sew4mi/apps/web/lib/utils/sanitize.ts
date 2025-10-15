/**
 * XSS Sanitization utilities
 * Provides functions to sanitize user input and prevent XSS attacks
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param text - The text to sanitize
 * @returns Sanitized text with HTML entities escaped
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'\/]/g, (char) => htmlEntities[char]);
}

/**
 * Removes all HTML tags from text
 * @param text - The text to strip HTML from
 * @returns Text with all HTML tags removed
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Sanitizes message content for safe storage and display
 * Removes script tags and HTML, prevents XSS attacks
 * @param message - The message content to sanitize
 * @returns Sanitized message content
 */
export function sanitizeMessage(message: string): string {
  if (!message) return '';

  // Remove any null bytes
  let sanitized = message.replace(/\0/g, '');

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: URIs (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Strip all remaining HTML tags
  sanitized = stripHtml(sanitized);

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validates that a message doesn't contain dangerous content
 * @param message - The message to validate
 * @returns True if message is safe, false if it contains dangerous content
 */
export function isMessageSafe(message: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
  ];

  return !dangerousPatterns.some(pattern => pattern.test(message));
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 * @param url - The URL to sanitize
 * @returns Safe URL or empty string if dangerous
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return '';
  }

  return url.trim();
}
