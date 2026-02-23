import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  SendOTPDto,
  VerifyOTPDto,
  CompleteRenterProfileDto,
  CompleteMerchantProfileDto,
  SubmitKYCDto,
} from './dto/auth.dto';
import { OTPService } from '../otp/otp.service';
import { UploadsService } from '../uploads/uploads.service';
import { Role, RegistrationStep, KYCStatus } from '../generated/prisma/client';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private otpService: OTPService,
    private uploadsService: UploadsService,
  ) {}

  /**
   * Validate JWT configuration on module initialization
   */
  onModuleInit() {
    const jwtSecret = this.config.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret) {
      this.logger.error('JWT_SECRET is not configured');
      throw new Error('JWT_SECRET is required. Please set it in your environment variables.');
    }

    if (!jwtRefreshSecret) {
      this.logger.error('JWT_REFRESH_SECRET is not configured');
      throw new Error(
        'JWT_REFRESH_SECRET is required. Please set it in your environment variables.',
      );
    }

    if (jwtSecret === jwtRefreshSecret) {
      this.logger.warn('JWT_SECRET and JWT_REFRESH_SECRET should be different for security');
    }

    this.logger.log('JWT configuration validated successfully');
  }

  /**
   * Send OTP to phone number.
   * Rejects immediately if the phone is already registered under a different role.
   * Otherwise always responds with a generic success message to prevent enumeration.
   */
  async sendOTP(dto: SendOTPDto) {
    // Role-mismatch guard: check before sending the OTP
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { role: true },
    });

    if (existing && existing.role !== dto.role) {
      const registeredAs = existing.role.charAt(0) + existing.role.slice(1).toLowerCase();
      throw new ForbiddenException(
        `This number is already registered as a ${registeredAs}. Please use the correct app.`,
      );
    }

    try {
      // Send OTP via WhatsApp
      await this.otpService.sendOTP(dto.phone);
    } catch (error) {
      // If it's a cooldown error, rethrow it
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        throw error;
      }
      // For other errors, log but don't expose to user (prevents enumeration)
    }

    // Always return success message (prevents enumeration attacks)
    return {
      message: 'If this number is registered, an OTP has been sent.',
      phone: dto.phone,
    };
  }

  /**
   * Verify OTP and create/login user
   */
  async verifyOTPAndAuthenticate(dto: VerifyOTPDto) {
    // Verify OTP
    await this.otpService.verifyOTP(dto.phone, dto.otp);

    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      // Create new user with phone verified
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          phoneVerified: true,
          registrationStep: RegistrationStep.PHONE_VERIFIED,
          role: dto.role,
        },
      });
    } else {
      // Role-mismatch guard: never authenticate a user into the wrong portal
      if (user.role !== dto.role) {
        const registeredAs = user.role.charAt(0) + user.role.slice(1).toLowerCase();
        throw new ForbiddenException(
          `This number is already registered as a ${registeredAs}. Please use the correct app.`,
        );
      }

      // Update existing user to mark phone as verified
      user = await this.prisma.user.update({
        where: { phone: dto.phone },
        data: {
          phoneVerified: true,
          registrationStep: user.registrationStep || RegistrationStep.PHONE_VERIFIED,
        },
      });
    }

    // Generate tokens with updated payload
    const tokens = await this.generateTokens(
      user.id,
      user.phone,
      user.role,
      user.phoneVerified,
      user.registrationStep,
    );

    return {
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        phoneVerified: user.phoneVerified,
        registrationStep: user.registrationStep,
      },
      ...this.formatTokenResponse(tokens),
    };
  }

  /**
   * Complete renter profile
   */
  async completeRenterProfile(userId: number, dto: CompleteRenterProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.registrationStep !== RegistrationStep.PHONE_VERIFIED) {
      throw new ConflictException('Invalid registration step');
    }

    // Update user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        registrationStep: RegistrationStep.PROFILE_COMPLETED,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneVerified: true,
        registrationStep: true,
      },
    });

    return {
      message: 'Profile completed successfully',
      user: updatedUser,
    };
  }

  /**
   * Complete merchant profile
   */
  async completeMerchantProfile(userId: number, dto: CompleteMerchantProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.registrationStep !== RegistrationStep.PHONE_VERIFIED) {
      throw new ConflictException('Invalid registration step');
    }

    // Update user profile with address
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        businessName: dto.businessName,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        registrationStep: RegistrationStep.PROFILE_COMPLETED,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        businessName: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        phoneVerified: true,
        registrationStep: true,
      },
    });

    return {
      message: 'Profile completed successfully',
      user: updatedUser,
    };
  }

  /**
   * Submit KYC for renters
   */
  async submitKYC(userId: number, dto: SubmitKYCDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { kyc: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.role !== Role.RENTER) {
      throw new ConflictException('KYC is only for renters');
    }

    if (user.registrationStep !== RegistrationStep.PROFILE_COMPLETED) {
      throw new ConflictException('Please complete your profile first');
    }

    if (user.kyc) {
      throw new ConflictException('KYC already submitted');
    }

    // Create KYC record
    const kyc = await this.prisma.kYC.create({
      data: {
        userId,
        licenseNumber: dto.licenseNumber,
        licenseImageUrl: this.uploadsService.buildPublicUrl(dto.licenseImageKey),
        licenseExpiryDate: new Date(dto.licenseExpiryDate),
        status: KYCStatus.PENDING,
      },
    });

    // Update user registration step
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        registrationStep: RegistrationStep.KYC_PENDING,
      },
    });

    return {
      message: 'KYC submitted successfully',
      kyc: {
        id: kyc.id,
        status: kyc.status,
        createdAt: kyc.createdAt,
      },
    };
  }

  /**
   * Get registration status
   */
  async getRegistrationStatus(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneVerified: true,
        registrationStep: true,
        businessName: true,
        kyc: {
          select: {
            id: true,
            status: true,
            rejectionReason: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user,
      nextStep: this.getNextRegistrationStep(user.registrationStep, user.role),
    };
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        this.logger.warn('Invalid refresh token attempted');
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await this.prisma.refreshToken
          .delete({
            where: { token: refreshToken },
          })
          .catch(() => {
            // Ignore errors during cleanup
          });

        this.logger.warn('Expired refresh token attempted', {
          userId: storedToken.userId,
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Verify user still exists and is active
      if (!storedToken.user) {
        await this.prisma.refreshToken
          .delete({
            where: { token: refreshToken },
          })
          .catch(() => {
            // Ignore errors during cleanup
          });

        throw new UnauthorizedException('User associated with token not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(
        storedToken.user.id,
        storedToken.user.phone,
        storedToken.user.role,
        storedToken.user.phoneVerified,
        storedToken.user.registrationStep,
      );

      // Delete old refresh token (one-time use)
      await this.prisma.refreshToken
        .delete({
          where: { token: refreshToken },
        })
        .catch((error) => {
          this.logger.warn('Error deleting old refresh token', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Don't throw - token generation was successful
        });

      return this.formatTokenResponse(tokens);
    } catch (error) {
      // If it's already an UnauthorizedException, rethrow it
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Error refreshing token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  /**
   * Logout user - invalidate refresh token
   */
  async logout(refreshToken: string) {
    if (!refreshToken) {
      this.logger.warn('Logout attempted without refresh token');
      return;
    }

    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });

      if (result.count === 0) {
        this.logger.warn('Attempted to logout with invalid refresh token');
      } else {
        this.logger.log('User logged out successfully');
      }
    } catch (error) {
      this.logger.error('Error during logout', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - logout should be idempotent
    }
  }

  /**
   * Validate user (used by JWT strategy)
   * Returns user object if found, null otherwise
   */
  async validateUser(userId: number) {
    if (!userId || typeof userId !== 'number') {
      this.logger.warn('Invalid userId provided to validateUser', { userId });
      return null;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phoneVerified: true,
          registrationStep: true,
        },
      });

      if (!user) {
        this.logger.warn(`User not found for userId: ${userId}`);
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error('Error validating user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  // Private helper methods

  /**
   * Generate JWT tokens with updated payload structure
   */
  private async generateTokens(
    userId: number,
    phone: string,
    role: Role,
    isVerified: boolean,
    registrationStep: RegistrationStep | null,
  ) {
    // Validate inputs
    if (!userId || !phone || !role) {
      this.logger.error('Invalid parameters for token generation', {
        userId,
        phone,
        role,
      });
      throw new Error('Invalid parameters for token generation');
    }

    const jwtSecret = this.config.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret || !jwtRefreshSecret) {
      this.logger.error('JWT secrets not configured');
      throw new Error('JWT configuration error');
    }

    const payload = {
      sub: userId,
      phone,
      role,
      isVerified,
      registrationStep,
    };

    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          secret: jwtSecret,
          expiresIn: this.config.get('JWT_EXPIRATION') || '15m',
        }),
        this.jwtService.signAsync(payload, {
          secret: jwtRefreshSecret,
          expiresIn: this.config.get('JWT_REFRESH_EXPIRATION') || '7d',
        }),
      ]);

      // Calculate expiration date for refresh token
      const expiresAt = new Date();
      const refreshExpiration = this.config.get('JWT_REFRESH_EXPIRATION') || '7d';
      const refreshExpirationDays = this.parseExpirationToDays(refreshExpiration);
      expiresAt.setDate(expiresAt.getDate() + refreshExpirationDays);

      // Store refresh token in database
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId,
          expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Error generating tokens', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpException(
        'Failed to generate authentication tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Backward-compatible token payload shape for clients using snake_case.
   */
  private formatTokenResponse(tokens: { accessToken: string; refreshToken: string }) {
    return {
      ...tokens,
    };
  }

  /**
   * Parse expiration string (e.g., "7d", "30d", "1h") to days
   */
  private parseExpirationToDays(expiration: string): number {
    const match = expiration.match(/^(\d+)([dhms])$/);
    if (!match) {
      // Default to 7 days if format is invalid
      return 7;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value;
      case 'h':
        return Math.ceil(value / 24);
      case 'm':
        return Math.ceil(value / (24 * 60));
      case 's':
        return Math.ceil(value / (24 * 60 * 60));
      default:
        return 7;
    }
  }

  /**
   * Helper to determine next registration step
   */
  private getNextRegistrationStep(currentStep: RegistrationStep | null, role: Role): string {
    if (!currentStep || currentStep === RegistrationStep.PHONE_VERIFIED) {
      return 'complete_profile';
    }

    if (currentStep === RegistrationStep.PROFILE_COMPLETED) {
      if (role === Role.RENTER) {
        return 'submit_kyc';
      }
      return 'registration_complete';
    }

    if (currentStep === RegistrationStep.KYC_PENDING) {
      return 'waiting_for_kyc_approval';
    }

    if (currentStep === RegistrationStep.KYC_APPROVED) {
      return 'registration_complete';
    }

    return 'unknown';
  }
}
