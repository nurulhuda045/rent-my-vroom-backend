/* global describe, it, expect, jest */
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { LicenseStatus, Role } from '../generated/prisma/client';

describe('BookingsService.create', () => {
  const makeService = () => {
    const prisma = {
      user: { findUnique: jest.fn() },
      vehicle: { findUnique: jest.fn() },
      booking: { create: jest.fn() },
    } as any;

    const notificationsService = {
      sendNewBookingEmail: jest.fn(),
    } as any;

    return {
      service: new BookingsService(prisma, notificationsService),
      prisma,
      notificationsService,
    };
  };

  it('throws NotFoundException when renter does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create(999, {
        vehicleId: 1,
        startDate: '2026-01-01T10:00:00Z',
        endDate: '2026-01-02T10:00:00Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when endDate is before or equal to startDate', async () => {
    const { service, prisma } = makeService();

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      role: Role.RENTER,
      licenseStatus: LicenseStatus.APPROVED,
    });

    prisma.vehicle.findUnique.mockResolvedValue({
      id: 2,
      isAvailable: true,
      pricePerDay: 100,
      merchantId: 2,
      merchant: { email: 'merchant@example.com', firstName: 'Mina' },
    });

    await expect(
      service.create(1, {
        vehicleId: 2,
        startDate: '2026-01-02T10:00:00Z',
        endDate: '2026-01-02T10:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('keeps renter role guard in place', async () => {
    const { service, prisma } = makeService();

    prisma.user.findUnique.mockResolvedValue({
      id: 10,
      role: Role.MERCHANT,
      licenseStatus: LicenseStatus.APPROVED,
    });

    await expect(
      service.create(10, {
        vehicleId: 2,
        startDate: '2026-01-01T10:00:00Z',
        endDate: '2026-01-03T10:00:00Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
