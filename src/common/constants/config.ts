/**
 * Application-wide configuration constants
 * Centralized to avoid magic numbers and make configuration easier
 */

/**
 * OTP Configuration
 */
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5, // 5 minutes as per requirements
  MAX_ATTEMPTS: 3,
  RATE_LIMIT_PER_HOUR: 3,
  RESEND_COOLDOWN_SECONDS: 30, // 30 seconds cooldown between resends
  HASH_ALGORITHM: 'sha256',
} as const;

/**
 * JWT Configuration defaults
 */
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
} as const;

/**
 * WhatsApp Configuration
 */
export const WHATSAPP_CONFIG = {
  API_VERSION: 'v21.0',
  OTP_TEMPLATE_NAME: 'otp_verification',
  TEMPLATE_LANGUAGE: 'en',
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/**
 * Phone number validation
 */
export const PHONE_VALIDATION = {
  E164_REGEX: /^\+[1-9]\d{1,14}$/,
  MIN_LENGTH: 10,
  MAX_LENGTH: 15,
} as const;

/**
 * File upload limits
 */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;

/**
 * Rate limiting
 */
export const RATE_LIMITS = {
  DEFAULT_TTL: 60000, // 1 minute
  DEFAULT_LIMIT: 10, // 10 requests per minute
  OTP_TTL: 3600000, // 1 hour
  OTP_LIMIT: 3, // 3 OTP requests per hour
} as const;
