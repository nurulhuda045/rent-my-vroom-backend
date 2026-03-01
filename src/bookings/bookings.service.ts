import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, UpdateBookingStatusDto } from './dto/bookings.dto';
import { BookingStatus, Role, LicenseStatus } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { ERROR_MESSAGES } from '../common';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private systemConfigService: SystemConfigService,
  ) {}

  async create(renterId: number, dto: CreateBookingDto) {
    // Verify renter has approved license
    const renter = await this.prisma.user.findUnique({
      where: { id: renterId },
    });

    if (!renter) {
      throw new NotFoundException('Renter not found');
    }

    if (renter.role !== Role.RENTER) {
      throw new ForbiddenException('Only renters can create bookings');
    }

    if (renter.licenseStatus !== LicenseStatus.APPROVED) {
      throw new ForbiddenException('Your driving license must be approved before booking');
    }

    // Get vehicle and merchant info
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
      include: { merchant: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (!vehicle.isAvailable) {
      throw new BadRequestException('Vehicle is not available');
    }

    // Calculate total price
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate <= new Date()) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_PAST_DATE);
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping bookings on this vehicle
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        status: { in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });

    if (overlapping) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_OVERLAP);
    }

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = Number(vehicle.pricePerDay) * days;

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        renterId,
        merchantId: vehicle.merchantId,
        vehicleId: dto.vehicleId,
        startDate,
        endDate,
        totalPrice,
        renterNotes: dto.renterNotes,
        status: BookingStatus.PENDING,
      },
      include: {
        vehicle: true,
        renter: true,
        merchant: true,
      },
    });

    // Send notification to merchant
    await this.notificationsService.sendNewBookingEmail(
      vehicle.merchant.email,
      vehicle.merchant.firstName,
      booking,
    );

    return booking;
  }

  async findRenterBookings(renterId: number) {
    const bookings = await this.prisma.booking.findMany({
      where: { renterId },
      include: {
        vehicle: true,
        merchant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            businessName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings;
  }

  async findMerchantBookings(merchantId: number) {
    const bookings = await this.prisma.booking.findMany({
      where: { merchantId },
      include: {
        vehicle: true,
        renter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings;
  }

  async acceptBooking(bookingId: number, merchantId: number, dto?: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { renter: true, vehicle: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.merchantId !== merchantId) {
      throw new ForbiddenException('You can only manage your own bookings');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be accepted');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.ACCEPTED,
        acceptedAt: new Date(),
        merchantNotes: dto?.merchantNotes,
      },
      include: {
        vehicle: true,
        renter: true,
      },
    });

    // Send notification to renter
    await this.notificationsService.sendBookingAcceptedEmail(
      booking.renter.email,
      booking.renter.firstName,
      updated,
    );

    return updated;
  }

  async rejectBooking(bookingId: number, merchantId: number, dto?: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { renter: true, vehicle: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.merchantId !== merchantId) {
      throw new ForbiddenException('You can only manage your own bookings');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be rejected');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.REJECTED,
        rejectedAt: new Date(),
        merchantNotes: dto?.merchantNotes,
      },
      include: {
        vehicle: true,
        renter: true,
      },
    });

    // Send notification to renter
    await this.notificationsService.sendBookingRejectedEmail(
      booking.renter.email,
      booking.renter.firstName,
      updated,
    );

    return updated;
  }

  async completeBooking(bookingId: number, merchantId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { renter: true, vehicle: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.merchantId !== merchantId) {
      throw new ForbiddenException('You can only manage your own bookings');
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException('Only accepted bookings can be completed');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        vehicle: true,
        renter: true,
      },
    });

    // Send notification to renter
    await this.notificationsService.sendBookingCompletedEmail(
      booking.renter.email,
      booking.renter.firstName,
      updated,
    );

    return updated;
  }

  async cancelBooking(bookingId: number, renterId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { renter: true, vehicle: true, merchant: true },
    });

    if (!booking) {
      throw new NotFoundException(ERROR_MESSAGES.BOOKING_NOT_FOUND);
    }

    if (booking.renterId !== renterId) {
      throw new ForbiddenException(ERROR_MESSAGES.BOOKING_CANCEL_UNAUTHORIZED);
    }

    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_CANCEL_NOT_ALLOWED);
    }

    const cancellationWindowHours = await this.systemConfigService.getCancellationWindowHours();
    const now = new Date();
    const hoursUntilStart = (booking.startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < cancellationWindowHours) {
      throw new BadRequestException(
        ERROR_MESSAGES.BOOKING_CANCEL_WINDOW_EXPIRED.replace('{hours}', String(cancellationWindowHours)),
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
      },
      include: {
        vehicle: true,
        renter: true,
        merchant: true,
      },
    });

    await this.notificationsService.sendBookingCancelledEmail(
      booking.merchant.email,
      booking.merchant.firstName,
      updated,
    );

    return updated;
  }

  async getMerchantStats(merchantId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [currentMonthEarnings, totalEarnings, activeBookingsCount, totalBookingsCount] =
      await Promise.all([
        this.prisma.booking.aggregate({
          where: {
            merchantId,
            status: { in: [BookingStatus.ACCEPTED, BookingStatus.COMPLETED] },
            startDate: { gte: startOfMonth },
          },
          _sum: { totalPrice: true },
        }),
        this.prisma.booking.aggregate({
          where: {
            merchantId,
            status: BookingStatus.COMPLETED,
          },
          _sum: { totalPrice: true },
        }),
        this.prisma.booking.count({
          where: {
            merchantId,
            status: { in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
          },
        }),
        this.prisma.booking.count({
          where: {
            merchantId,
          },
        }),
      ]);

    return {
      currentMonthEarnings: Number(currentMonthEarnings._sum.totalPrice || 0),
      totalEarnings: Number(totalEarnings._sum.totalPrice || 0),
      activeBookingsCount,
      totalBookingsCount,
    };
  }
}
