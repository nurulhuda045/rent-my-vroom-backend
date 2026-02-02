# WhatsApp Business API Integration Guide

## Overview

This guide provides detailed implementation steps for integrating WhatsApp Business API (Cloud API) for OTP-based authentication in the RentMyVroom platform.

## Prerequisites

1. Meta Business Account
2. WhatsApp Business App created in Meta for Developers
3. Verified phone number for WhatsApp Business
4. Approved message template for OTP delivery
5. Permanent access token from Meta

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install axios form-data
npm install @types/node --save-dev
```

### Step 2: Configure Environment Variables

Update your `.env` file:

```env
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

### Step 3: Create WhatsApp Service

**File**: `src/whatsapp/whatsapp.service.ts`

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    error_data?: any;
    fbtrace_id: string;
  };
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;

  constructor(private configService: ConfigService) {
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION', 'v21.0');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.apiUrl = `https://graph.facebook.com/${apiVersion}/${this.phoneNumberId}/messages`;

    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('WhatsApp configuration is missing. Please check environment variables.');
    }
  }

  /**
   * Send OTP message using WhatsApp Business API
   * @param phone Phone number in E.164 format (e.g., +919876543210)
   * @param otp 6-digit OTP code
   * @returns Message ID from WhatsApp
   */
  async sendOTPMessage(phone: string, otp: string): Promise<string> {
    try {
      // Validate phone number format (E.164)
      if (!this.isValidE164Phone(phone)) {
        throw new HttpException(
          'Invalid phone number format. Must be in E.164 format (e.g., +919876543210)',
          HttpStatus.BAD_REQUEST,
        );
      }

      const expiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 10);

      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: 'otp_verification', // Your approved template name
          language: {
            code: 'en', // Language code
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: otp,
                },
                {
                  type: 'text',
                  text: expiryMinutes.toString(),
                },
              ],
            },
          ],
        },
      };

      this.logger.log(`Sending OTP to ${phone}`);

      const response = await axios.post<WhatsAppMessageResponse>(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const messageId = response.data.messages[0].id;
      this.logger.log(`OTP sent successfully. Message ID: ${messageId}`);

      return messageId;
    } catch (error) {
      this.handleWhatsAppError(error);
    }
  }

  /**
   * Send a custom template message
   * @param phone Phone number in E.164 format
   * @param templateName Name of the approved template
   * @param components Template components with parameters
   */
  async sendTemplateMessage(
    phone: string,
    templateName: string,
    components: any[],
  ): Promise<string> {
    try {
      if (!this.isValidE164Phone(phone)) {
        throw new HttpException('Invalid phone number format', HttpStatus.BAD_REQUEST);
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en',
          },
          components,
        },
      };

      const response = await axios.post<WhatsAppMessageResponse>(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.messages[0].id;
    } catch (error) {
      this.handleWhatsAppError(error);
    }
  }

  /**
   * Validate E.164 phone number format
   * @param phone Phone number to validate
   */
  private isValidE164Phone(phone: string): boolean {
    // E.164 format: +[country code][number]
    // Length: 1-15 digits (excluding +)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  /**
   * Handle WhatsApp API errors
   * @param error Error from axios or other sources
   */
  private handleWhatsAppError(error: any): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<WhatsAppError>;

      if (axiosError.response) {
        const errorData = axiosError.response.data;
        this.logger.error('WhatsApp API Error:', errorData);

        // Handle specific error codes
        const errorCode = errorData.error?.code;
        const errorMessage = errorData.error?.message || 'WhatsApp API error';

        switch (errorCode) {
          case 131031: // Template does not exist
            throw new HttpException(
              'Message template not found or not approved',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          case 131047: // Re-engagement message
            throw new HttpException(
              'Cannot send message. User needs to initiate conversation first',
              HttpStatus.BAD_REQUEST,
            );
          case 131051: // Unsupported message type
            throw new HttpException('Unsupported message type', HttpStatus.BAD_REQUEST);
          case 133016: // Rate limit exceeded
            throw new HttpException(
              'Rate limit exceeded. Please try again later',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          default:
            throw new HttpException(
              `WhatsApp API Error: ${errorMessage}`,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
      }
    }

    this.logger.error('Unexpected error sending WhatsApp message:', error);
    throw new HttpException('Failed to send WhatsApp message', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
```

### Step 4: Create WhatsApp Webhook Controller

**File**: `src/whatsapp/whatsapp.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  private readonly verifyToken: string;

  constructor(private configService: ConfigService) {
    this.verifyToken = this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

    if (!this.verifyToken) {
      throw new Error('WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured');
    }
  }

  /**
   * Webhook verification endpoint (GET)
   * Meta will call this endpoint to verify the webhook
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    this.logger.log('Webhook verification request received');

    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.error('Webhook verification failed');
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  /**
   * Webhook event handler (POST)
   * Receives message status updates from WhatsApp
   */
  @Post('webhook')
  async handleWebhook(@Body() body: any): Promise<{ status: string }> {
    this.logger.log('Webhook event received');
    this.logger.debug('Webhook payload:', JSON.stringify(body, null, 2));

    try {
      // Verify this is a WhatsApp webhook
      if (body.object !== 'whatsapp_business_account') {
        this.logger.warn('Invalid webhook object type');
        return { status: 'ignored' };
      }

      // Process each entry
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            await this.handleMessageEvent(change.value);
          }
        }
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      // Return 200 to prevent Meta from retrying
      return { status: 'error' };
    }
  }

  /**
   * Handle message events (status updates, incoming messages)
   */
  private async handleMessageEvent(value: any): Promise<void> {
    // Handle message status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        this.logger.log(`Message ${status.id} status: ${status.status}`);

        switch (status.status) {
          case 'sent':
            this.logger.log(`Message sent to WhatsApp server`);
            break;
          case 'delivered':
            this.logger.log(`Message delivered to recipient`);
            break;
          case 'read':
            this.logger.log(`Message read by recipient`);
            break;
          case 'failed':
            this.logger.error(`Message delivery failed:`, status.errors);
            // TODO: Update OTP record in database to mark as failed
            break;
        }
      }
    }

    // Handle incoming messages (if needed)
    if (value.messages) {
      for (const message of value.messages) {
        this.logger.log(`Incoming message from ${message.from}: ${message.text?.body}`);
        // TODO: Handle incoming messages if needed
      }
    }
  }
}
```

### Step 5: Create WhatsApp Module

**File**: `src/whatsapp/whatsapp.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';

@Module({
  imports: [ConfigModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
```

### Step 6: Update OTP Service

**File**: `src/otp/otp.service.ts`

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class OTPService {
  private readonly logger = new Logger(OTPService.name);
  private readonly otpExpiryMinutes: number;
  private readonly maxAttempts: number;
  private readonly rateLimitPerHour: number;

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    private configService: ConfigService,
  ) {
    this.otpExpiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 10);
    this.maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 3);
    this.rateLimitPerHour = this.configService.get<number>('OTP_RATE_LIMIT_PER_HOUR', 3);
  }

  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash OTP before storing
   */
  private hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Send OTP to phone number via WhatsApp
   */
  async sendOTP(phone: string): Promise<void> {
    // Check rate limiting
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await this.prisma.oTP.count({
      where: {
        phone,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentOTPs >= this.rateLimitPerHour) {
      throw new HttpException(
        'Too many OTP requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generate OTP
    const otp = this.generateOTP();
    const hashedOTP = this.hashOTP(otp);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

    // Save OTP to database
    await this.prisma.oTP.create({
      data: {
        phone,
        otp: hashedOTP,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });

    // Send OTP via WhatsApp
    try {
      await this.whatsappService.sendOTPMessage(phone, otp);
      this.logger.log(`OTP sent to ${phone}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${phone}:`, error);
      throw new HttpException(
        'Failed to send OTP. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(phone: string, otp: string): Promise<boolean> {
    const hashedOTP = this.hashOTP(otp);

    // Find the most recent unverified OTP for this phone
    const otpRecord = await this.prisma.oTP.findFirst({
      where: {
        phone,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    // Check attempts
    if (otpRecord.attempts >= this.maxAttempts) {
      throw new HttpException('Maximum verification attempts exceeded', HttpStatus.BAD_REQUEST);
    }

    // Increment attempts
    await this.prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { attempts: otpRecord.attempts + 1 },
    });

    // Verify OTP
    if (otpRecord.otp !== hashedOTP) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    // Mark as verified
    await this.prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    this.logger.log(`OTP verified for ${phone}`);
    return true;
  }

  /**
   * Cleanup expired OTPs (run as cron job)
   */
  async cleanupExpiredOTPs(): Promise<void> {
    const result = await this.prisma.oTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired OTPs`);
  }
}
```

### Step 7: Update OTP Module

**File**: `src/otp/otp.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OTPService } from './otp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, PrismaModule, WhatsAppModule],
  providers: [OTPService],
  exports: [OTPService],
})
export class OTPModule {}
```

## Message Template Setup

### Creating the OTP Template in Meta Business Manager

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to your WhatsApp Business Account
3. Go to **Message Templates**
4. Click **Create Template**
5. Fill in the details:

**Template Name**: `otp_verification`
**Category**: `AUTHENTICATION`
**Languages**: Select English (and other languages as needed)

**Template Content**:

```
Your RentMyVroom verification code is: {{1}}

This code will expire in {{2}} minutes.

Do not share this code with anyone.
```

6. Add variables:
   - `{{1}}`: OTP code
   - `{{2}}`: Expiry time

7. Submit for approval
8. Wait for Meta to approve (usually takes 24-48 hours)

## Testing

### Test with Sandbox Numbers

Before going live, test with WhatsApp sandbox numbers:

1. Add test phone numbers in Meta for Developers
2. Send test OTPs to these numbers
3. Verify delivery and formatting

### Test Webhook

Use tools like ngrok to expose your local server:

```bash
ngrok http 3000
```

Then configure the ngrok URL as your webhook URL in Meta for Developers.

## Common Issues and Solutions

### Issue 1: Template Not Found (Error 131031)

**Solution**: Ensure your template is approved and the name matches exactly.

### Issue 2: Rate Limit Exceeded (Error 133016)

**Solution**: Implement proper rate limiting in your application.

### Issue 3: Invalid Phone Number

**Solution**: Ensure phone numbers are in E.164 format (+[country code][number]).

### Issue 4: Webhook Not Receiving Events

**Solution**:

- Verify webhook URL is publicly accessible (HTTPS)
- Check verify token matches
- Review webhook subscriptions in Meta for Developers

## Production Checklist

- [ ] Message template approved
- [ ] Permanent access token generated
- [ ] Webhook configured and verified
- [ ] Environment variables set
- [ ] Rate limiting implemented
- [ ] Error handling in place
- [ ] Logging configured
- [ ] Phone number validation working
- [ ] OTP expiry working correctly
- [ ] Database cleanup cron job scheduled
- [ ] Security review completed
- [ ] Load testing completed

## Additional Resources

- [WhatsApp Business Platform Documentation](https://developers.facebook.com/docs/whatsapp)
- [Cloud API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
