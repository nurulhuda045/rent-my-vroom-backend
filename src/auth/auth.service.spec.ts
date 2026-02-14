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
