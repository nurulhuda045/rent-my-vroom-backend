import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { LicenseStatus, Role } from '../generated/prisma/client';
import { randomUUID } from 'crypto';

describe('UsersService.uploadLicense', () => {
  it('stores Cloudflare R2 public url based on uploaded key', async () => {
    const userId = randomUUID();

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: userId, role: Role.RENTER }),
        update: jest.fn().mockResolvedValue({ id: userId, licenseStatus: LicenseStatus.PENDING }),
      },
    } as any;

    const messagingService = {
      notifyLicenseApproved: jest.fn(),
      notifyLicenseRejected: jest.fn(),
    } as any;

    const uploadsService = {
      buildPublicUrl: jest.fn().mockReturnValue(`https://cdn.example.com/license/${userId}/doc.jpg`),
    } as any;

    const service = new UsersService(prisma, messagingService, uploadsService);

    await service.uploadLicense(userId, { licenseKey: `license/${userId}/doc.jpg` });

    expect(uploadsService.buildPublicUrl).toHaveBeenCalledWith(`license/${userId}/doc.jpg`);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          licenseUrl: `https://cdn.example.com/license/${userId}/doc.jpg`,
          licenseStatus: LicenseStatus.PENDING,
        }),
      }),
    );
  });
});

describe('UsersService.approveLicense', () => {
  it('rejects approving license for non-renter accounts', async () => {
    const adminId = randomUUID();
    const targetUserId = randomUUID();

    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: adminId, role: Role.ADMIN })
          .mockResolvedValueOnce({ id: targetUserId, role: Role.MERCHANT }),
        update: jest.fn(),
      },
    } as any;

    const messagingService = {
      notifyLicenseApproved: jest.fn(),
      notifyLicenseRejected: jest.fn(),
    } as any;

    const uploadsService = {
      buildPublicUrl: jest.fn(),
    } as any;

    const service = new UsersService(prisma, messagingService, uploadsService);

    await expect(
      service.approveLicense(adminId, targetUserId, { status: LicenseStatus.APPROVED }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('UsersService.updateProfile', () => {
  it('returns full user profile fields after update', async () => {
    const userId = randomUUID();

    const prisma = {
      user: {
        update: jest.fn().mockResolvedValue({ id: userId, licenseStatus: LicenseStatus.APPROVED, registrationStep: 'KYC_APPROVED' }),
      },
    } as any;

    const messagingService = {
      notifyLicenseApproved: jest.fn(),
      notifyLicenseRejected: jest.fn(),
    } as any;

    const uploadsService = {
      buildPublicUrl: jest.fn(),
    } as any;

    const service = new UsersService(prisma, messagingService, uploadsService);

    const result = await service.updateProfile(userId, { firstName: 'Jane' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: { firstName: 'Jane' },
        select: expect.objectContaining({
          licenseStatus: true,
          registrationStep: true,
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: userId }));
  });
});
