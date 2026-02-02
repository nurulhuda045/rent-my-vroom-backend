import * as crypto from 'crypto';
import { PHONE_VALIDATION, OTP_CONFIG } from '../constants/config';

/**
 * Phone number utilities
 */
export class PhoneUtils {
  /**
   * Validate phone number in E.164 format
   * @param phone - Phone number to validate
   * @returns true if valid, false otherwise
   */
  static isValidE164(phone: string): boolean {
    return PHONE_VALIDATION.E164_REGEX.test(phone);
  }

  /**
   * Format phone number to E.164 format
   * @param phone - Phone number to format
   * @param countryCode - Default country code (e.g., '+91' for India)
   * @returns Formatted phone number
   */
  static formatToE164(phone: string, countryCode: string = '+91'): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If already has country code, return as is
    if (phone.startsWith('+')) {
      return phone;
    }

    // Add country code
    return `${countryCode}${digits}`;
  }

  /**
   * Mask phone number for display (e.g., +91******3210)
   * @param phone - Phone number to mask
   * @returns Masked phone number
   */
  static maskPhone(phone: string): string {
    if (phone.length < 8) return phone;
    const countryCode = phone.substring(0, 3);
    const lastDigits = phone.substring(phone.length - 4);
    const maskedMiddle = '*'.repeat(phone.length - 7);
    return `${countryCode}${maskedMiddle}${lastDigits}`;
  }
}

/**
 * OTP utilities
 */
export class OTPUtils {
  /**
   * Generate a random OTP
   * @param length - Length of OTP (default: 6)
   * @returns Generated OTP as string
   */
  static generate(length: number = OTP_CONFIG.LENGTH): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Hash OTP using SHA-256
   * @param otp - OTP to hash
   * @returns Hashed OTP
   */
  static hash(otp: string): string {
    return crypto.createHash(OTP_CONFIG.HASH_ALGORITHM).update(otp).digest('hex');
  }

  /**
   * Verify OTP against hash
   * @param otp - Plain OTP
   * @param hash - Hashed OTP
   * @returns true if match, false otherwise
   */
  static verify(otp: string, hash: string): boolean {
    return this.hash(otp) === hash;
  }

  /**
   * Calculate OTP expiry time
   * @param minutes - Minutes until expiry (default from config)
   * @returns Expiry date
   */
  static calculateExpiry(minutes: number = OTP_CONFIG.EXPIRY_MINUTES): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Check if OTP is expired
   * @param expiryDate - Expiry date to check
   * @returns true if expired, false otherwise
   */
  static isExpired(expiryDate: Date): boolean {
    return expiryDate < new Date();
  }
}

/**
 * Date utilities
 */
export class DateUtils {
  /**
   * Add days to a date
   * @param date - Base date
   * @param days - Number of days to add
   * @returns New date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Add hours to a date
   * @param date - Base date
   * @param hours - Number of hours to add
   * @returns New date
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * Get date N hours ago
   * @param hours - Number of hours
   * @returns Date
   */
  static hoursAgo(hours: number): Date {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  /**
   * Format date to YYYY-MM-DD
   * @param date - Date to format
   * @returns Formatted date string
   */
  static toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

/**
 * String utilities
 */
export class StringUtils {
  /**
   * Capitalize first letter
   * @param str - String to capitalize
   * @returns Capitalized string
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Generate random string
   * @param length - Length of string
   * @returns Random string
   */
  static randomString(length: number): string {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  }

  /**
   * Truncate string with ellipsis
   * @param str - String to truncate
   * @param maxLength - Maximum length
   * @returns Truncated string
   */
  static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}
