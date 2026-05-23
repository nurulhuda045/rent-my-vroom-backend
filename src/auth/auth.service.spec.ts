import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { KYCStatus, RegistrationStep, Role } from '../generated/prisma/client';
import { randomUUID } from 'crypto';

describe('AuthService.submitKYC', () => {
  it('stores KYC document and holder photo as Cloudflare R2 public urls from keys', async () => {
    const userId = randomUUID();
    const kycId = randomUUID();

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          role: Role.RENTER,
          registrationStep: RegistrationStep.PROFILE_COMPLETED,
          kyc: null,
        }),
        update: jest.fn().mockResolvedValue({ id: userId }),
      },
      kYC: {
        create: jest.fn().mockResolvedValue({
          id: kycId,
          status: KYCStatus.PENDING,
          createdAt: new Date(),
        }),
      },
    } as any;

    const uploadsService = {
      buildPublicUrl: jest
        .fn()
        .mockReturnValueOnce(`https://cdn.example.com/license/${userId}/kyc.jpg`)
        .mockReturnValueOnce(`https://cdn.example.com/holder-photo/${userId}/selfie.jpg`),
    } as any;

    const service = new AuthService(prisma, {} as any, {} as any, {} as any, uploadsService);

    await service.submitKYC(userId, {
      licenseNumber: 'DL1234567890',
      licenseImageKey: `license/${userId}/kyc.jpg`,
      holderPhotoKey: `holder-photo/${userId}/selfie.jpg`,
      licenseExpiryDate: '2028-01-01',
    });

    expect(uploadsService.buildPublicUrl).toHaveBeenCalledWith(`license/${userId}/kyc.jpg`);
    expect(uploadsService.buildPublicUrl).toHaveBeenCalledWith(`holder-photo/${userId}/selfie.jpg`);
    expect(prisma.kYC.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          licenseImageUrl: `https://cdn.example.com/license/${userId}/kyc.jpg`,
          holderPhotoUrl: `https://cdn.example.com/holder-photo/${userId}/selfie.jpg`,
        }),
      }),
    );
  });
});

// ─── refresh ─────────────────────────────────────────────────────────────────

describe('AuthService.refresh', () => {
  it('returns camelCase token keys', async () => {
    const userId = randomUUID();
    const refreshTokenId = randomUUID();
    const oldRefreshToken = 'old-refresh-token';
    const accessToken = 'new-access-token';
    const newRefreshToken = 'new-refresh-token';

    const prisma = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          token: oldRefreshToken,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          user: {
            id: userId,
            phone: '+919876543210',
            role: Role.RENTER,
            phoneVerified: true,
            registrationStep: RegistrationStep.PHONE_VERIFIED,
          },
        }),
        create: jest.fn().mockResolvedValue({ id: refreshTokenId }),
        delete: jest.fn().mockResolvedValue({ id: refreshTokenId }),
      },
    } as any;

    const jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(newRefreshToken),
    } as any;

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
        return undefined;
      }),
    } as any;

    const service = new AuthService(prisma, jwtService, configService, {} as any, {} as any);

    const result = await service.refresh(oldRefreshToken);

    expect(result).toMatchObject({ accessToken, refreshToken: newRefreshToken });
  });
});

// ─── Role-guard tests ────────────────────────────────────────────────────────

describe('AuthService.sendOTP — role guard', () => {
  it('throws ForbiddenException when phone is registered under a different role', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ role: Role.RENTER }),
      },
    } as any;

    const service = new AuthService(prisma, {} as any, {} as any, {} as any, {} as any);

    await expect(service.sendOTP({ phone: '+919876543210', role: Role.MERCHANT })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('proceeds normally when user does not exist yet', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    } as any;

    const otpService = { sendOTP: jest.fn().mockResolvedValue(undefined) } as any;

    const service = new AuthService(prisma, {} as any, {} as any, otpService, {} as any);

    const result = await service.sendOTP({ phone: '+919876543210', role: Role.MERCHANT });

    expect(result).toHaveProperty('message');
    expect(otpService.sendOTP).toHaveBeenCalledWith('+919876543210', undefined);
  });
});

describe('AuthService.verifyOTPAndAuthenticate — role guard', () => {
  it('throws ForbiddenException when existing user has a different role', async () => {
    const userId = randomUUID();

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          phone: '+919876543210',
          role: Role.RENTER,
          phoneVerified: true,
          registrationStep: RegistrationStep.PROFILE_COMPLETED,
        }),
      },
    } as any;

    const otpService = {
      verifyOTP: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new AuthService(prisma, {} as any, {} as any, otpService, {} as any);

    await expect(
      service.verifyOTPAndAuthenticate({
        phone: '+919876543210',
        otp: '123456',
        role: Role.MERCHANT,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
