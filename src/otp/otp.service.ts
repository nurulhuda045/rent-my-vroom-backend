import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OTPUtils, OTP_CONFIG, ERROR_MESSAGES } from '../common';

@Injectable()
export class OTPService {
  private readonly logger = new Logger(OTPService.name);
  private readonly otpExpiryMinutes: number;
  private readonly maxAttempts: number;
  private readonly resendCooldownSeconds: number;
  private readonly testOTP: string | null;

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    private configService: ConfigService,
  ) {
    this.otpExpiryMinutes = this.configService.get<number>(
      'OTP_EXPIRY_MINUTES',
      OTP_CONFIG.EXPIRY_MINUTES,
    );
    this.maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', OTP_CONFIG.MAX_ATTEMPTS);
    this.resendCooldownSeconds = this.configService.get<number>(
      'OTP_RESEND_COOLDOWN_SECONDS',
      OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
    );
    this.testOTP = this.configService.get<string>('TEST_OTP', null);

    if (this.testOTP) {
      this.logger.warn(
        '⚠️  TEST_OTP is enabled! Using hardcoded OTP for testing. DO NOT use in production!',
      );
    }
  }

  /**
   * Send OTP to phone number via WhatsApp
   * Implements resend cooldown and prevents enumeration attacks
   */
  async sendOTP(phone: string): Promise<void> {
    // Check resend cooldown (skip in TEST MODE for faster iteration)
    if (!this.testOTP) {
      await this.checkResendCooldown(phone);
    }

    // Use TEST_OTP if available, otherwise generate random OTP
    const otp = this.testOTP || OTPUtils.generate();
    const hashedOTP = OTPUtils.hash(otp);
    const expiresAt = OTPUtils.calculateExpiry(this.otpExpiryMinutes);

    // Save OTP to database (hashed, never plaintext)
    await this.prisma.oTP.create({
      data: {
        phone,
        otp: hashedOTP,
        expiresAt,
        verified: false,
        attempts: 0,
        lastSentAt: new Date(),
      },
    });

    // Send OTP via WhatsApp (skip if using TEST_OTP)
    if (this.testOTP) {
      this.logger.log(`🧪 TEST MODE: Using hardcoded OTP ${this.testOTP} for ${phone}`);
    } else {
      try {
        await this.whatsappService.sendOTPMessage(phone, otp);
        this.logger.log(`OTP sent to ${phone}`);
      } catch (error) {
        this.logger.error(`Failed to send OTP to ${phone}:`, error);
        // Don't throw error to prevent enumeration attacks
        // The user will see success message regardless
      }
    }
  }

  /**
   * Verify OTP
   * Implements max attempts and prevents timing attacks
   */
  async verifyOTP(phone: string, otp: string): Promise<boolean> {
    // If TEST_OTP is enabled and matches the provided OTP, verify successfully
    if (this.testOTP && otp === this.testOTP) {
      this.logger.log(`🧪 TEST MODE: Verified using hardcoded OTP for ${phone}`);

      // Still try to find and clean up any existing OTP record for this phone to stay clean
      const otpRecord = await this.findValidOTP(phone);
      if (otpRecord) {
        await this.markAsVerified(otpRecord.id);
        await this.deleteOTP(otpRecord.id);
      }

      return true;
    }

    // Standard verification logic
    const otpRecord = await this.findValidOTP(phone);

    if (!otpRecord) {
      throw new HttpException(ERROR_MESSAGES.OTP_EXPIRED, HttpStatus.BAD_REQUEST);
    }

    // Check attempts
    if (otpRecord.attempts >= this.maxAttempts) {
      throw new HttpException(ERROR_MESSAGES.OTP_MAX_ATTEMPTS, HttpStatus.BAD_REQUEST);
    }

    // Increment attempts first (before verification)
    await this.incrementAttempts(otpRecord.id);

    // Verify OTP using constant-time comparison via hash
    if (!OTPUtils.verify(otp, otpRecord.otp)) {
      throw new HttpException(ERROR_MESSAGES.OTP_INVALID, HttpStatus.BAD_REQUEST);
    }

    // Mark as verified and delete OTP on success
    await this.markAsVerified(otpRecord.id);
    await this.deleteOTP(otpRecord.id);

    this.logger.log(`OTP verified for ${phone}`);
    return true;
  }

  /**
   * Cleanup expired OTPs (run as cron job every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
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

  // Private helper methods

  /**
   * Check resend cooldown (30 seconds)
   * Prevents spam and abuse
   */
  private async checkResendCooldown(phone: string): Promise<void> {
    const cooldownTime = new Date(Date.now() - this.resendCooldownSeconds * 1000);

    const recentOTP = await this.prisma.oTP.findFirst({
      where: {
        phone,
        lastSentAt: {
          gte: cooldownTime,
        },
      },
      orderBy: {
        lastSentAt: 'desc',
      },
    });

    if (recentOTP) {
      const secondsRemaining = Math.ceil(
        (recentOTP.lastSentAt.getTime() + this.resendCooldownSeconds * 1000 - Date.now()) / 1000,
      );
      throw new HttpException(
        `Please wait ${secondsRemaining} seconds before requesting a new OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Find valid (unverified, not expired) OTP for phone
   */
  private async findValidOTP(phone: string) {
    return this.prisma.oTP.findFirst({
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
  }

  /**
   * Increment verification attempts
   */
  private async incrementAttempts(otpId: number): Promise<void> {
    await this.prisma.oTP.update({
      where: { id: otpId },
      data: { attempts: { increment: 1 } },
    });
  }

  /**
   * Mark OTP as verified
   */
  private async markAsVerified(otpId: number): Promise<void> {
    await this.prisma.oTP.update({
      where: { id: otpId },
      data: { verified: true },
    });
  }

  /**
   * Delete OTP after successful verification
   */
  private async deleteOTP(otpId: number): Promise<void> {
    await this.prisma.oTP.delete({
      where: { id: otpId },
    });
  }
}
