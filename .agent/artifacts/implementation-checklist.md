# WhatsApp OTP Authentication - Implementation Checklist

## Phase 1: WhatsApp Business API Setup

### 1.1 Meta Business Account Setup

- [ ] Create Meta Business Account at [business.facebook.com](https://business.facebook.com)
- [ ] Verify your business identity
- [ ] Add team members if needed
- [ ] Note down Business Account ID

### 1.2 WhatsApp Business App Creation

- [ ] Go to [Meta for Developers](https://developers.facebook.com)
- [ ] Create a new app (Business type)
- [ ] Add WhatsApp product to the app
- [ ] Note down App ID

### 1.3 Phone Number Setup

- [ ] Register a phone number for WhatsApp Business
- [ ] Verify the phone number via SMS
- [ ] Note down Phone Number ID
- [ ] Test the phone number in sandbox mode

### 1.4 Message Template Creation

- [ ] Go to WhatsApp Manager > Message Templates
- [ ] Create new template with name: `otp_verification`
- [ ] Select category: `AUTHENTICATION`
- [ ] Add template content:

  ```
  Your RentMyVroom verification code is: {{1}}

  This code will expire in {{2}} minutes.

  Do not share this code with anyone.
  ```

- [ ] Add variables: {{1}} for OTP, {{2}} for expiry minutes
- [ ] Submit template for approval
- [ ] Wait for approval (24-48 hours)
- [ ] Note down approved template name

### 1.5 Access Token Generation

- [ ] Go to App Dashboard > WhatsApp > API Setup
- [ ] Generate a temporary access token (for testing)
- [ ] Generate a permanent access token (for production)
  - Go to Business Settings > System Users
  - Create a system user
  - Generate token with `whatsapp_business_messaging` permission
- [ ] Securely store the access token
- [ ] Note down the token (never commit to version control)

### 1.6 Webhook Configuration

- [ ] Generate a random secure verify token (e.g., using `openssl rand -hex 32`)
- [ ] Note down the verify token
- [ ] Prepare webhook URL: `https://your-domain.com/api/whatsapp/webhook`
- [ ] Subscribe to webhook fields: `messages`, `message_status`

## Phase 2: Database Schema Changes

### 2.1 Update User Model

- [ ] Add `phoneVerified` boolean field (default: false)
- [ ] Add `registrationStep` enum field (PHONE_VERIFIED, PROFILE_COMPLETED, KYC_PENDING, KYC_APPROVED)
- [ ] Make `email` optional
- [ ] Make `password` optional
- [ ] Add structured address fields for merchants

### 2.2 Create OTP Model

- [ ] Create OTP table with fields:
  - `id` (auto-increment)
  - `phone` (string, indexed)
  - `otp` (string, hashed)
  - `expiresAt` (DateTime)
  - `verified` (boolean)
  - `attempts` (int)
  - `createdAt` (DateTime)

### 2.3 Create KYC Model

- [ ] Create KYC table with fields:
  - `id` (auto-increment)
  - `userId` (foreign key)
  - `licenseNumber` (string)
  - `licenseImageUrl` (string)
  - `licenseExpiryDate` (DateTime)
  - `status` (enum: PENDING, APPROVED, REJECTED)
  - `rejectionReason` (string, optional)
  - `verifiedAt` (DateTime, optional)
  - `createdAt` (DateTime)
  - `updatedAt` (DateTime)

### 2.4 Run Migrations

- [ ] Create Prisma migration: `npx prisma migrate dev --name add-whatsapp-otp-auth`
- [ ] Verify migration applied successfully
- [ ] Generate Prisma client: `npx prisma generate`

## Phase 3: Backend Implementation

### 3.1 Install Dependencies

- [ ] Run: `npm install axios form-data`
- [ ] Run: `npm install @types/node --save-dev`
- [ ] Verify dependencies installed in package.json

### 3.2 Environment Variables

- [ ] Add to `.env`:
  ```env
  WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
  WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
  WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
  WHATSAPP_API_VERSION=v21.0
  WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_secure_token
  OTP_EXPIRY_MINUTES=10
  OTP_MAX_ATTEMPTS=3
  OTP_RATE_LIMIT_PER_HOUR=3
  ```
- [ ] Update `.env.example` with placeholder values
- [ ] Verify `.env` is in `.gitignore`

### 3.3 Create WhatsApp Module

- [ ] Create `src/whatsapp/whatsapp.module.ts`
- [ ] Create `src/whatsapp/whatsapp.service.ts`
  - [ ] Implement `sendOTPMessage(phone, otp)`
  - [ ] Implement `sendTemplateMessage(phone, templateName, components)`
  - [ ] Implement `isValidE164Phone(phone)`
  - [ ] Implement `handleWhatsAppError(error)`
- [ ] Create `src/whatsapp/whatsapp.controller.ts`
  - [ ] Implement `GET /whatsapp/webhook` (verification)
  - [ ] Implement `POST /whatsapp/webhook` (event handler)
- [ ] Register module in `app.module.ts`

### 3.4 Create/Update OTP Module

- [ ] Create `src/otp/otp.module.ts`
- [ ] Create `src/otp/otp.service.ts`
  - [ ] Implement `generateOTP()`
  - [ ] Implement `hashOTP(otp)`
  - [ ] Implement `sendOTP(phone)`
  - [ ] Implement `verifyOTP(phone, otp)`
  - [ ] Implement `cleanupExpiredOTPs()`
- [ ] Import WhatsAppModule in OTPModule
- [ ] Register module in `app.module.ts`

### 3.5 Update Auth Module

- [ ] Create DTOs:
  - [ ] `SendOTPDto`
  - [ ] `VerifyOTPDto`
  - [ ] `CompleteRenterProfileDto`
  - [ ] `CompleteMerchantProfileDto`
  - [ ] `SubmitKYCDto`
- [ ] Update `auth.controller.ts`:
  - [ ] Add `POST /auth/send-otp`
  - [ ] Add `POST /auth/verify-otp`
  - [ ] Add `POST /auth/complete-profile`
  - [ ] Add `POST /auth/submit-kyc`
  - [ ] Add `GET /auth/registration-status`
- [ ] Update `auth.service.ts`:
  - [ ] Implement `sendOTP(phone, role)`
  - [ ] Implement `verifyOTPAndAuthenticate(phone, otp)`
  - [ ] Implement `completeRenterProfile(userId, data)`
  - [ ] Implement `completeMerchantProfile(userId, data)`
  - [ ] Implement `submitKYC(userId, data)`
  - [ ] Implement `getRegistrationStatus(userId)`

### 3.6 Create KYC Module

- [ ] Create `src/kyc/kyc.module.ts`
- [ ] Create `src/kyc/kyc.service.ts`
  - [ ] Implement `submitKYC(userId, data)`
  - [ ] Implement `getKYCStatus(userId)`
  - [ ] Implement `approveKYC(kycId)`
  - [ ] Implement `rejectKYC(kycId, reason)`
- [ ] Create `src/kyc/kyc.controller.ts`
  - [ ] Add `GET /kyc/status`
  - [ ] Add `POST /kyc/submit`
  - [ ] Add `GET /kyc/pending` (Admin)
  - [ ] Add `POST /kyc/approve/:id` (Admin)
  - [ ] Add `POST /kyc/reject/:id` (Admin)
- [ ] Register module in `app.module.ts`

### 3.7 Add Cron Job for OTP Cleanup

- [ ] Install `@nestjs/schedule`: `npm install @nestjs/schedule`
- [ ] Import ScheduleModule in app.module.ts
- [ ] Create cron job to run `cleanupExpiredOTPs()` every hour
- [ ] Test cron job execution

## Phase 4: Testing

### 4.1 Local Testing Setup

- [ ] Install ngrok: `npm install -g ngrok` or download from ngrok.com
- [ ] Start local server: `npm run dev`
- [ ] Expose server with ngrok: `ngrok http 3000`
- [ ] Note down ngrok HTTPS URL

### 4.2 Webhook Testing

- [ ] Configure webhook URL in Meta for Developers (use ngrok URL)
- [ ] Test webhook verification (GET request)
- [ ] Send test OTP and verify webhook receives status updates
- [ ] Check logs for webhook events
- [ ] Verify message status updates in database

### 4.3 OTP Flow Testing

- [ ] Test OTP generation
- [ ] Test OTP sending via WhatsApp (use test numbers)
- [ ] Test OTP verification (valid OTP)
- [ ] Test OTP verification (invalid OTP)
- [ ] Test OTP verification (expired OTP)
- [ ] Test rate limiting (max 3 requests per hour)
- [ ] Test max verification attempts (max 3 attempts)

### 4.4 Registration Flow Testing - Renter

- [ ] Test Step 1: Send OTP → Verify OTP
- [ ] Verify user created with `registrationStep = PHONE_VERIFIED`
- [ ] Verify JWT token returned
- [ ] Test Step 2: Complete profile
- [ ] Verify `registrationStep = PROFILE_COMPLETED`
- [ ] Test Step 3: Submit KYC
- [ ] Verify KYC record created with `status = PENDING`
- [ ] Verify `registrationStep = KYC_PENDING`

### 4.5 Registration Flow Testing - Merchant

- [ ] Test Step 1: Send OTP → Verify OTP
- [ ] Verify user created with `registrationStep = PHONE_VERIFIED`
- [ ] Test Step 2: Complete profile with address
- [ ] Verify `registrationStep = PROFILE_COMPLETED`
- [ ] Verify merchant can list vehicles

### 4.6 KYC Flow Testing

- [ ] Test KYC submission
- [ ] Test admin viewing pending KYC requests
- [ ] Test admin approving KYC
- [ ] Verify `registrationStep = KYC_APPROVED`
- [ ] Test admin rejecting KYC
- [ ] Verify rejection reason stored

### 4.7 Security Testing

- [ ] Test phone number validation (E.164 format)
- [ ] Test duplicate phone number prevention
- [ ] Test OTP hashing (verify OTPs are hashed in DB)
- [ ] Test rate limiting enforcement
- [ ] Test webhook verify token validation
- [ ] Test expired OTP cleanup

### 4.8 Error Handling Testing

- [ ] Test invalid phone number format
- [ ] Test WhatsApp API errors (simulate)
- [ ] Test network failures
- [ ] Test invalid webhook payloads
- [ ] Test missing environment variables

## Phase 5: Production Deployment

### 5.1 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured on production server
- [ ] Database migrations applied to production
- [ ] WhatsApp message template approved
- [ ] Permanent access token generated
- [ ] Production webhook URL configured (HTTPS)
- [ ] Webhook verified in Meta for Developers
- [ ] Error logging configured
- [ ] Monitoring set up

### 5.2 Deployment

- [ ] Deploy backend to production
- [ ] Verify deployment successful
- [ ] Check application logs
- [ ] Test health endpoint

### 5.3 Webhook Configuration

- [ ] Update webhook URL in Meta for Developers (production URL)
- [ ] Verify webhook with production URL
- [ ] Test webhook events in production
- [ ] Monitor webhook logs

### 5.4 Production Testing

- [ ] Send test OTP to real phone number
- [ ] Verify OTP received on WhatsApp
- [ ] Complete full registration flow (Renter)
- [ ] Complete full registration flow (Merchant)
- [ ] Test KYC submission and approval
- [ ] Monitor error logs
- [ ] Check webhook delivery status

### 5.5 Monitoring Setup

- [ ] Set up alerts for failed OTP deliveries
- [ ] Monitor WhatsApp API error rates
- [ ] Track OTP verification success rates
- [ ] Monitor webhook event processing
- [ ] Set up dashboard for key metrics

## Phase 6: Documentation & Training

### 6.1 Documentation

- [ ] Update API documentation with new endpoints
- [ ] Document registration flows
- [ ] Document error codes and handling
- [ ] Create troubleshooting guide
- [ ] Document WhatsApp Business API setup process

### 6.2 Team Training

- [ ] Train support team on OTP flow
- [ ] Train admin team on KYC approval process
- [ ] Document common issues and solutions
- [ ] Create runbook for production issues

## Phase 7: Post-Launch

### 7.1 Monitoring (First Week)

- [ ] Monitor OTP delivery success rates daily
- [ ] Check for any error spikes
- [ ] Review user feedback
- [ ] Monitor WhatsApp API costs
- [ ] Check webhook event processing

### 7.2 Optimization

- [ ] Analyze OTP verification times
- [ ] Optimize rate limiting if needed
- [ ] Review and adjust OTP expiry time
- [ ] Optimize database queries
- [ ] Review error handling

### 7.3 Scaling Preparation

- [ ] Monitor message volume
- [ ] Check WhatsApp tier progression
- [ ] Plan for tier upgrades if needed
- [ ] Review rate limits
- [ ] Optimize for high volume

## Rollback Plan

### If Issues Occur

- [ ] Document the issue
- [ ] Check error logs
- [ ] Verify environment variables
- [ ] Check WhatsApp Business API status
- [ ] Verify webhook configuration
- [ ] Test with sandbox numbers
- [ ] Contact Meta support if needed

### Emergency Rollback

- [ ] Disable OTP login feature flag
- [ ] Fall back to email/password login
- [ ] Notify users of temporary issue
- [ ] Investigate and fix issue
- [ ] Re-enable after verification

## Success Criteria

- [ ] OTP delivery success rate > 95%
- [ ] OTP verification success rate > 90%
- [ ] Average OTP delivery time < 5 seconds
- [ ] Zero security incidents
- [ ] Webhook events processed within 1 second
- [ ] No rate limit violations
- [ ] User registration completion rate > 80%
- [ ] KYC approval process < 24 hours

## Notes

- Keep Meta Business Manager credentials secure
- Never commit access tokens to version control
- Regularly rotate access tokens
- Monitor WhatsApp API costs
- Keep message templates up to date
- Review Meta's policy updates regularly
- Maintain backup communication channels
- Document all configuration changes

## Support Contacts

- **Meta Business Support**: [business.facebook.com/help](https://business.facebook.com/help)
- **WhatsApp Business API Support**: [developers.facebook.com/support](https://developers.facebook.com/support)
- **Meta for Developers Community**: [developers.facebook.com/community](https://developers.facebook.com/community)
