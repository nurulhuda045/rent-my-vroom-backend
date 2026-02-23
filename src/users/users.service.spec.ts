import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { LicenseStatus, Role } from '../generated/prisma/client';

describe('UsersService.uploadLicense', () => {
  it('stores Cloudflare R2 public url based on uploaded key', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 11, role: Role.RENTER }),
        update: jest.fn().mockResolvedValue({ id: 11, licenseStatus: LicenseStatus.PENDING }),
      },
    } as any;

    const notificationsService = {
      sendLicenseApprovalEmail: jest.fn(),
    } as any;

    const uploadsService = {
      buildPublicUrl: jest.fn().mockReturnValue('https://cdn.example.com/license/11/doc.jpg'),
    } as any;

    const service = new UsersService(prisma, notificationsService, uploadsService);

    await service.uploadLicense(11, { licenseKey: 'license/11/doc.jpg' });

    expect(uploadsService.buildPublicUrl).toHaveBeenCalledWith('license/11/doc.jpg');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          licenseUrl: 'https://cdn.example.com/license/11/doc.jpg',
          licenseStatus: LicenseStatus.PENDING,
        }),
      }),
    );
  });
});

describe('UsersService.approveLicense', () => {
  it('rejects approving license for non-renter accounts', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 1, role: Role.ADMIN })
          .mockResolvedValueOnce({ id: 2, role: Role.MERCHANT }),
        update: jest.fn(),
      },
    } as any;

    const notificationsService = {
      sendLicenseApprovalEmail: jest.fn(),
    } as any;

    const uploadsService = {
      buildPublicUrl: jest.fn(),
    } as any;

    const service = new UsersService(prisma, notificationsService, uploadsService);

    await expect(
      service.approveLicense(1, 2, { status: LicenseStatus.APPROVED }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('UsersService.updateProfile', () => {
  it('returns full user profile fields after update', async () => {
    const prisma = {
      user: {
        update: jest.fn().mockResolvedValue({ id: 11, licenseStatus: LicenseStatus.APPROVED, registrationStep: 'KYC_APPROVED' }),
      },
    } as any;

    const notificationsService = {
      sendLicenseApprovalEmail: jest.fn(),
    } as any;

    const uploadsService = {
      buildPublicUrl: jest.fn(),
    } as any;

    const service = new UsersService(prisma, notificationsService, uploadsService);

    const result = await service.updateProfile(11, { firstName: 'Jane' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: { firstName: 'Jane' },
        select: expect.objectContaining({
          licenseStatus: true,
          registrationStep: true,
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 11 }));
  });
});
