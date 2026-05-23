import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingStatus, LicenseStatus, Role } from '../generated/prisma/client';
import { randomUUID } from 'crypto';

const makeService = () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    vehicle: { findUnique: jest.fn() },
    booking: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const messagingService = {
    notifyNewBookingMerchant: jest.fn(),
    notifyBookingCancelledMerchant: jest.fn(),
  } as any;

  const systemConfigService = {
    getCancellationWindowHours: jest.fn().mockResolvedValue(4),
  } as any;

  return {
    service: new BookingsService(prisma, messagingService, systemConfigService),
    prisma,
    messagingService,
    systemConfigService,
  };
};

describe('BookingsService.create', () => {

  it('throws NotFoundException when renter does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create(randomUUID(), {
        vehicleId: randomUUID(),
        startDate: '2026-01-01T10:00:00Z',
        endDate: '2026-01-02T10:00:00Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when startDate is in the past', async () => {
    const { service, prisma } = makeService();
    const renterId = randomUUID();
    const merchantId = randomUUID();
    const vehicleId = randomUUID();

    prisma.user.findUnique.mockResolvedValue({
      id: renterId,
      role: Role.RENTER,
      licenseStatus: LicenseStatus.APPROVED,
    });

    prisma.vehicle.findUnique.mockResolvedValue({
      id: vehicleId,
      isAvailable: true,
      pricePerDay: 100,
      merchantId,
      merchant: { email: 'merchant@example.com', firstName: 'Mina' },
    });

    await expect(
      service.create(renterId, {
        vehicleId,
        startDate: '2020-01-01T10:00:00Z',
        endDate: '2020-01-05T10:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when endDate is before or equal to startDate', async () => {
    const { service, prisma } = makeService();
    const renterId = randomUUID();
    const merchantId = randomUUID();
    const vehicleId = randomUUID();

    prisma.user.findUnique.mockResolvedValue({
      id: renterId,
      role: Role.RENTER,
      licenseStatus: LicenseStatus.APPROVED,
    });

    prisma.vehicle.findUnique.mockResolvedValue({
      id: vehicleId,
      isAvailable: true,
      pricePerDay: 100,
      merchantId,
      merchant: { email: 'merchant@example.com', firstName: 'Mina' },
    });

    await expect(
      service.create(renterId, {
        vehicleId,
        startDate: '2030-01-02T10:00:00Z',
        endDate: '2030-01-02T10:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('keeps renter role guard in place', async () => {
    const { service, prisma } = makeService();
    const userId = randomUUID();
    const vehicleId = randomUUID();

    prisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: Role.MERCHANT,
      licenseStatus: LicenseStatus.APPROVED,
    });

    await expect(
      service.create(userId, {
        vehicleId,
        startDate: '2026-01-01T10:00:00Z',
        endDate: '2026-01-03T10:00:00Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('BookingsService.cancelBooking', () => {
  it('throws NotFoundException when booking does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(service.cancelBooking(randomUUID(), randomUUID())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException when renter does not own the booking', async () => {
    const { service, prisma } = makeService();
    const bookingId = randomUUID();
    const renterId = randomUUID();

    prisma.booking.findUnique.mockResolvedValue({
      id: bookingId,
      renterId: randomUUID(), // different renter
      status: BookingStatus.PENDING,
      startDate: new Date('2030-06-01T10:00:00Z'),
    });

    await expect(service.cancelBooking(bookingId, renterId)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws BadRequestException when booking is already completed', async () => {
    const { service, prisma } = makeService();
    const bookingId = randomUUID();
    const renterId = randomUUID();

    prisma.booking.findUnique.mockResolvedValue({
      id: bookingId,
      renterId,
      status: BookingStatus.COMPLETED,
      startDate: new Date('2030-06-01T10:00:00Z'),
    });

    await expect(service.cancelBooking(bookingId, renterId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when within cancellation window', async () => {
    const { service, prisma, systemConfigService } = makeService();
    systemConfigService.getCancellationWindowHours.mockResolvedValue(4);
    const bookingId = randomUUID();
    const renterId = randomUUID();

    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    prisma.booking.findUnique.mockResolvedValue({
      id: bookingId,
      renterId,
      status: BookingStatus.PENDING,
      startDate: twoHoursFromNow,
    });

    await expect(service.cancelBooking(bookingId, renterId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('successfully cancels a booking outside the cancellation window', async () => {
    const { service, prisma, systemConfigService } = makeService();
    systemConfigService.getCancellationWindowHours.mockResolvedValue(4);
    const bookingId = randomUUID();
    const renterId = randomUUID();

    const tenHoursFromNow = new Date(Date.now() + 10 * 60 * 60 * 1000);
    const bookingData = {
      id: bookingId,
      renterId,
      status: BookingStatus.PENDING,
      startDate: tenHoursFromNow,
      renter: { email: 'renter@test.com', firstName: 'John' },
      merchant: { email: 'merchant@test.com', firstName: 'Jane', phone: '+10000000001' },
      vehicle: { make: 'Toyota', model: 'Camry' },
    };

    prisma.booking.findUnique.mockResolvedValue(bookingData);
    prisma.booking.update.mockResolvedValue({
      ...bookingData,
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    const result = await service.cancelBooking(bookingId, renterId);
    expect(result.status).toBe(BookingStatus.CANCELLED);
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: bookingId },
        data: expect.objectContaining({ status: BookingStatus.CANCELLED }),
      }),
    );
  });
});
