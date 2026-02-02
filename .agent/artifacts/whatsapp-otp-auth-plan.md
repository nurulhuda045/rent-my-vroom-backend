# WhatsApp OTP Authentication Implementation Plan

## Overview

Implement WhatsApp OTP-based authentication for Renters and Merchants with multi-step registration flows and KYC verification.

## Database Schema Changes

### 1. Update User Model

- Add `phoneVerified` boolean field
- Add `registrationStep` enum field (PHONE_VERIFIED, PROFILE_COMPLETED, KYC_PENDING, KYC_APPROVED)
- Make `email` optional (since users register with phone)
- Make `password` optional (OTP-based auth)
- Add structured address fields for merchants (addressLine1, addressLine2, city, state, postalCode, country, latitude, longitude)

### 2. Create OTP Model

- `id`: Auto-increment
- `phone`: String (indexed)
- `otp`: String (hashed)
- `expiresAt`: DateTime
- `verified`: Boolean
- `attempts`: Int (to prevent brute force)
- `createdAt`: DateTime

### 3. Create KYC Model (for Renters)

- `id`: Auto-increment
- `userId`: Foreign key to User
- `licenseNumber`: String
- `licenseImageUrl`: String
- `licenseExpiryDate`: DateTime
- `status`: Enum (PENDING, APPROVED, REJECTED)
- `rejectionReason`: String (optional)
- `verifiedAt`: DateTime (optional)
- `createdAt`: DateTime
- `updatedAt`: DateTime

## Backend Implementation

### 1. Install Dependencies

```bash
npm install axios form-data
npm install @types/node --save-dev
```

### 2. Environment Variables

Add to `.env`:

```
# WhatsApp Business API Configuration
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v21.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_secure_token

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_PER_HOUR=3
```

### 3. Create WhatsApp Service

- `src/whatsapp/whatsapp.service.ts`
  - `sendOTP(phone: string, otp: string)`: Send OTP via WhatsApp Business API
  - Uses WhatsApp Cloud API (Graph API) for message delivery
  - Implements message templates for OTP delivery
  - Handles API responses and error cases
  - Methods:
    - `sendTemplateMessage(to: string, templateName: string, components: any[])`: Send template-based messages
    - `sendOTPMessage(phone: string, otp: string)`: Send OTP using approved template
    - `verifyWebhook(mode: string, token: string, challenge: string)`: Verify webhook for message status
    - `handleWebhook(body: any)`: Handle incoming webhook events (delivery status, read receipts)

**Note**: WhatsApp Business API requires:

- Pre-approved message templates for OTP delivery
- Phone numbers in E.164 format (e.g., +919876543210)
- Business verification and phone number registration
- Webhook setup for delivery status tracking

### 4. WhatsApp Business API Setup

#### Message Template Configuration

Create and get approved the following message template in Meta Business Manager:

**Template Name**: `otp_verification`
**Category**: `AUTHENTICATION`
**Language**: English (and other supported languages)

**Template Content**:

```
Your RentMyVroom verification code is: {{1}}

This code will expire in {{2}} minutes.

Do not share this code with anyone.
```

**Template Components**:

- `{{1}}`: OTP code (6 digits)
- `{{2}}`: Expiry time in minutes

#### Webhook Configuration

Set up webhook endpoint for message status updates:

- **Webhook URL**: `https://your-domain.com/api/whatsapp/webhook`
- **Verify Token**: Random secure string (store in env as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
- **Subscribe to**: `messages`, `message_status`

#### API Endpoints Used

- **Send Message**: `POST https://graph.facebook.com/v21.0/{phone-number-id}/messages`
- **Upload Media** (for future use): `POST https://graph.facebook.com/v21.0/{phone-number-id}/media`

### 5. Create OTP Service

- `src/otp/otp.service.ts`
  - `generateOTP()`: Generate 6-digit OTP
  - `sendOTP(phone: string)`: Generate and send OTP
  - `verifyOTP(phone: string, otp: string)`: Verify OTP
  - `cleanupExpiredOTPs()`: Cleanup expired OTPs (cron job)

### 6. Update Auth DTOs

Create new DTOs:

- `SendOTPDto`: { phone: string, role: Role }
- `VerifyOTPDto`: { phone: string, otp: string }
- `CompleteRenterProfileDto`: { firstName, lastName, email?, dateOfBirth }
- `CompleteMerchantProfileDto`: { firstName, lastName, email?, businessName, addressLine1, addressLine2?, city, state, postalCode, country, latitude, longitude }
- `SubmitKYCDto`: { licenseNumber, licenseImageUrl, licenseExpiryDate }

### 7. Update Auth Controller

New endpoints:

- `POST /auth/send-otp`: Send OTP to phone
- `POST /auth/verify-otp`: Verify OTP and create/login user
- `POST /auth/complete-profile`: Complete user profile (step 2)
- `POST /auth/submit-kyc`: Submit KYC for renters (step 3)
- `GET /auth/registration-status`: Get current registration step

### 8. Update Auth Service

New methods:

- `sendOTP(phone: string, role: Role)`
- `verifyOTPAndAuthenticate(phone: string, otp: string)`
- `completeRenterProfile(userId: number, data: CompleteRenterProfileDto)`
- `completeMerchantProfile(userId: number, data: CompleteMerchantProfileDto)`
- `submitKYC(userId: number, data: SubmitKYCDto)`
- `getRegistrationStatus(userId: number)`

### 9. Create KYC Module

- `src/kyc/kyc.controller.ts`
  - `GET /kyc/status`: Get KYC status
  - `POST /kyc/submit`: Submit KYC documents
  - `GET /kyc/pending` (Admin): Get pending KYC requests
  - `POST /kyc/approve/:id` (Admin): Approve KYC
  - `POST /kyc/reject/:id` (Admin): Reject KYC

- `src/kyc/kyc.service.ts`
  - `submitKYC(userId, data)`
  - `getKYCStatus(userId)`
  - `approveKYC(kycId)`
  - `rejectKYC(kycId, reason)`

### 10. Create WhatsApp Webhook Controller

- `src/whatsapp/whatsapp.controller.ts`
  - `GET /whatsapp/webhook`: Verify webhook (Meta verification)
    - Validates verify token
    - Returns challenge string
  - `POST /whatsapp/webhook`: Handle incoming webhook events
    - Process message delivery status
    - Handle read receipts
    - Log message failures
    - Update OTP delivery status in database

## Registration Flows

### Renter Flow

1. **Step 1**: Send OTP to phone → Verify OTP
   - User provides: phone number, role (RENTER)
   - System creates User with `registrationStep = PHONE_VERIFIED`
   - Returns: JWT token

2. **Step 2**: Complete Profile
   - User provides: firstName, lastName, email (optional), dateOfBirth
   - System updates User with `registrationStep = PROFILE_COMPLETED`
   - Returns: Updated user data

3. **Step 3**: Submit KYC (Driving License)
   - User provides: licenseNumber, licenseImageUrl, licenseExpiryDate
   - System creates KYC record with `status = PENDING`
   - Updates User with `registrationStep = KYC_PENDING`
   - Returns: KYC submission confirmation

4. **Admin Approval**:
   - Admin reviews and approves/rejects KYC
   - On approval: User `registrationStep = KYC_APPROVED`, `licenseStatus = APPROVED`
   - User can now rent vehicles

### Merchant Flow

1. **Step 1**: Send OTP to phone → Verify OTP
   - User provides: phone number, role (MERCHANT)
   - System creates User with `registrationStep = PHONE_VERIFIED`
   - Returns: JWT token

2. **Step 2**: Complete Profile with Address
   - User provides: firstName, lastName, email (optional), businessName, full address with lat/long
   - System updates User with `registrationStep = PROFILE_COMPLETED`
   - For merchants, PROFILE_COMPLETED is the final step
   - Returns: Updated user data

3. **Ready to List Vehicles**:
   - Merchant can now list vehicles for rent

## Security Considerations

1. Hash OTPs before storing in database
2. Rate limit OTP requests (max 3 per phone per hour)
3. Expire OTPs after 10 minutes
4. Limit OTP verification attempts (max 3)
5. Lock account after too many failed attempts
6. Validate phone number format (E.164)
7. Prevent duplicate phone numbers
8. Secure WhatsApp Access Token (use environment variables, never commit)
9. Validate webhook signatures (if Meta provides them)
10. Implement webhook verify token validation
11. Use HTTPS for webhook endpoints
12. Sanitize and validate all webhook payloads

## Migration Strategy

1. Create migration for new schema changes
2. Update existing users to have `phoneVerified = false` and appropriate `registrationStep`
3. Maintain backward compatibility with email/password login
4. Add feature flag to enable/disable OTP login

## WhatsApp Business API Setup Steps

1. **Create Meta Business Account**: Sign up at business.facebook.com
2. **Create WhatsApp Business App**: In Meta for Developers
3. **Add WhatsApp Product**: To your app
4. **Get Phone Number**: Register and verify a phone number
5. **Create Message Template**: Submit OTP template for approval
6. **Generate Access Token**: Create permanent access token
7. **Configure Webhook**: Set up webhook URL and verify token
8. **Test in Sandbox**: Use test numbers before going live
9. **Submit for Review**: Get app reviewed for production access

## Testing Checklist

- [ ] OTP generation and sending via WhatsApp Business API
- [ ] OTP verification (valid/invalid/expired)
- [ ] Rate limiting on OTP requests
- [ ] Multi-step registration for Renter
- [ ] Multi-step registration for Merchant
- [ ] KYC submission and approval flow
- [ ] Phone number validation (E.164 format)
- [ ] Duplicate phone prevention
- [ ] Token generation after OTP verification
- [ ] Registration status endpoint
- [ ] WhatsApp webhook verification
- [ ] WhatsApp webhook message status handling
- [ ] WhatsApp API error handling
- [ ] Message template rendering with dynamic values
- [ ] Fallback mechanism if WhatsApp delivery fails
