/**
 * Shared Prisma select objects to maintain consistency across services
 * and avoid repetition of field selections
 */

/**
 * Address fields for merchant/user locations
 */
export const ADDRESS_FIELDS = {
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  latitude: true,
  longitude: true,
} as const;

/**
 * Basic user fields (commonly used across services)
 */
export const BASIC_USER_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
} as const;

/**
 * Merchant-specific fields
 */
export const MERCHANT_FIELDS = {
  ...BASIC_USER_FIELDS,
  businessName: true,
  ...ADDRESS_FIELDS,
} as const;

/**
 * Renter-specific fields
 */
export const RENTER_FIELDS = {
  ...BASIC_USER_FIELDS,
  licenseUrl: true,
  licenseStatus: true,
  licenseApprovedAt: true,
} as const;

/**
 * User profile fields (complete)
 */
export const USER_PROFILE_FIELDS = {
  ...BASIC_USER_FIELDS,
  businessName: true,
  ...ADDRESS_FIELDS,
  licenseUrl: true,
  licenseStatus: true,
  licenseApprovedAt: true,
  phoneVerified: true,
  registrationStep: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * KYC fields
 */
export const KYC_FIELDS = {
  id: true,
  licenseNumber: true,
  licenseImageUrl: true,
  licenseExpiryDate: true,
  status: true,
  rejectionReason: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * KYC with user details
 */
export const KYC_WITH_USER_FIELDS = {
  ...KYC_FIELDS,
  user: {
    select: BASIC_USER_FIELDS,
  },
} as const;
