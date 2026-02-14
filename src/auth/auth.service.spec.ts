/* global describe, it, expect, jest */
import { AuthService } from './auth.service';
import { KYCStatus, RegistrationStep, Role } from '../generated/prisma/client';

describe('AuthService.submitKYC', () => {
  it('stores license image as Cloudflare R2 public url from key', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          role: Role.RENTER,
          registrationStep: RegistrationStep.PROFILE_COMPLETED,
          kyc: null,
        }),
        update: jest.fn().mockResolvedValue({ id: 7 }),
      },
      kYC: {
        create: jest.fn().mockResolvedValue({ id: 91, status: KYCStatus.PENDING, createdAt: new Date() }),
      },
    } as any;

    const jwtService = {} as any;
    const configService = {} as any;
    const otpService = {} as any;
    const uploadsService = {
      buildPublicUrl: jest.fn().mockReturnValue('https://cdn.example.com/license/7/kyc.jpg'),
    } as any;

    const service = new AuthService(prisma, jwtService, configService, otpService, uploadsService);

    await service.submitKYC(7, {
      licenseNumber: 'DL1234567890',
      licenseImageKey: 'license/7/kyc.jpg',
      licenseExpiryDate: '2028-01-01',
    });

    expect(uploadsService.buildPublicUrl).toHaveBeenCalledWith('license/7/kyc.jpg');
    expect(prisma.kYC.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          licenseImageUrl: 'https://cdn.example.com/license/7/kyc.jpg',
        }),
      }),
    );
  });
});

describe('AuthService.refresh', () => {
  it('returns both camelCase and snake_case token keys for compatibility', async () => {
    const oldRefreshToken = 'old-refresh-token';
    const accessToken = 'new-access-token';
    const newRefreshToken = 'new-refresh-token';

    const prisma = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          token: oldRefreshToken,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          user: {
            id: 12,
            phone: '+919876543210',
            role: Role.RENTER,
            phoneVerified: true,
            registrationStep: RegistrationStep.PHONE_VERIFIED,
          },
        }),
        create: jest.fn().mockResolvedValue({ id: 1 }),
        delete: jest.fn().mockResolvedValue({ id: 1 }),
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

    const otpService = {} as any;
    const uploadsService = {} as any;

    const service = new AuthService(prisma, jwtService, configService, otpService, uploadsService);

    const result = await service.refresh(oldRefreshToken);

    expect(result).toEqual({
      accessToken,
      refreshToken: newRefreshToken,
      access_token: accessToken,
      refresh_token: newRefreshToken,
    });
  });
});
