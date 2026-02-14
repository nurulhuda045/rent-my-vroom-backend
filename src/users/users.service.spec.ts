/* global describe, it, expect, jest */
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
