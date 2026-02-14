import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  HttpException,
  HttpStatus,
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
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private otpService: OTPService,
    private uploadsService: UploadsService,
  ) {}

  /**
   * Send OTP to phone number
   * Always responds with success message to prevent enumeration attacks
   */
  async sendOTP(dto: SendOTPDto) {
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
      ...tokens,
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
    try {
      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        await this.prisma.refreshToken.delete({
          where: { token: refreshToken },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(
        storedToken.user.id,
        storedToken.user.phone,
        storedToken.user.role,
        storedToken.user.phoneVerified,
        storedToken.user.registrationStep,
      );

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { token: refreshToken },
      });

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  /**
   * Validate user (used by JWT strategy)
   */
  async validateUser(userId: number) {
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

    return user;
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
    const payload = {
      sub: userId,
      phone,
      role,
      isVerified,
      registrationStep,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRATION') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRATION') || '7d',
      }),
    ]);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

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
