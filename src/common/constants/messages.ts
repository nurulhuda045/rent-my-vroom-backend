/**
 * Centralized error messages to maintain consistency
 * and make updates easier
 */

export const ERROR_MESSAGES = {
  // User errors
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  PHONE_ALREADY_REGISTERED: 'Phone number already registered',
  EMAIL_ALREADY_REGISTERED: 'Email already registered',
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized access',

  // OTP errors
  OTP_SEND_FAILED: 'Failed to send OTP. Please try again.',
  OTP_INVALID: 'Invalid OTP',
  OTP_EXPIRED: 'Invalid or expired OTP',
  OTP_MAX_ATTEMPTS: 'Maximum verification attempts exceeded',
  OTP_RATE_LIMIT: 'Too many OTP requests. Please try again later.',

  // KYC errors
  KYC_NOT_FOUND: 'KYC not found',
  KYC_ALREADY_SUBMITTED: 'KYC already submitted',
  KYC_NOT_PENDING: 'KYC is not pending',
  KYC_ONLY_FOR_RENTERS: 'KYC is only for renters',
  KYC_PROFILE_INCOMPLETE: 'Please complete your profile first',

  // Registration errors
  INVALID_REGISTRATION_STEP: 'Invalid registration step',
  PHONE_NOT_VERIFIED: 'Phone number not verified',

  // Vehicle errors
  VEHICLE_NOT_FOUND: 'Vehicle not found',
  VEHICLE_LICENSE_EXISTS: 'Vehicle with this license plate already exists',
  VEHICLE_UNAUTHORIZED: 'You can only manage your own vehicles',

  // License errors
  LICENSE_ONLY_RENTERS: 'Only renters can upload licenses',
  LICENSE_APPROVAL_ADMIN_ONLY: 'Only admins can approve licenses',
  LICENSE_APPROVAL_RENTER_ONLY: 'License approval only applies to renter accounts',

  // Role errors
  MERCHANT_ONLY: 'Only merchants can perform this action',
  RENTER_ONLY: 'Only renters can perform this action',
  ADMIN_ONLY: 'Only admins can perform this action',

  // WhatsApp errors
  WHATSAPP_NOT_CONFIGURED: 'WhatsApp Business API is not configured',
  WHATSAPP_SEND_FAILED: 'Failed to send WhatsApp message',
  WHATSAPP_INVALID_PHONE: 'Invalid phone number format. Use E.164 format (e.g., +919876543210)',

  // Token errors
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  REFRESH_TOKEN_EXPIRED: 'Refresh token expired',

  // Generic
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again later.',
} as const;

export const SUCCESS_MESSAGES = {
  // OTP
  OTP_SENT: 'OTP sent successfully',
  OTP_VERIFIED: 'OTP verified successfully',

  // Profile
  PROFILE_COMPLETED: 'Profile completed successfully',
  PROFILE_UPDATED: 'Profile updated successfully',

  // KYC
  KYC_SUBMITTED: 'KYC submitted successfully',
  KYC_APPROVED: 'KYC approved successfully',
  KYC_REJECTED: 'KYC rejected',

  // Auth
  LOGOUT_SUCCESS: 'Logged out successfully',
  REGISTRATION_SUCCESS: 'Registration completed successfully',

  // Vehicle
  VEHICLE_CREATED: 'Vehicle created successfully',
  VEHICLE_UPDATED: 'Vehicle updated successfully',
  VEHICLE_DELETED: 'Vehicle deleted successfully',
} as const;
