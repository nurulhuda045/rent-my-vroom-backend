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

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(renterId: number, dto: CreateBookingDto) {
    // Verify renter has approved license
    const renter = await this.prisma.user.findUnique({
      where: { id: renterId },
    });

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
}
