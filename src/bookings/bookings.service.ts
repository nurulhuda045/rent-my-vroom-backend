import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBookingDto,
  CreateOfflineBookingDto,
  UpdateBookingStatusDto,
  UpdateOfflinePaymentDto,
} from './dto/bookings.dto';
import {
  BookingSource,
  BookingStatus,
  LicenseStatus,
  Role,
} from '../generated/prisma/client';
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

  // ---------------------------------------------------------------------------
  // ONLINE booking flow (renter-initiated)
  // ---------------------------------------------------------------------------

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
      throw new NotFoundException(ERROR_MESSAGES.VEHICLE_NOT_FOUND);
    }

    if (!vehicle.isAvailable) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_VEHICLE_UNAVAILABLE);
    }

    // Calculate total price
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate <= new Date()) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_PAST_DATE);
    }

    if (endDate <= startDate) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_DATE_RANGE_INVALID);
    }

    // Check for overlapping bookings on this vehicle
    const overlapping = await this.findOverlappingBooking(dto.vehicleId, startDate, endDate);

    if (overlapping) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_OVERLAP);
    }

    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = Number(vehicle.pricePerDay) * days;

    // Determine merchant response window:
    // same-day bookings (start today) → 1 hour; future bookings → 24 hours
    const now = new Date();
    const isSameDay = startDate.toDateString() === now.toDateString();
    const responseWindowHours = isSameDay ? 1 : 24;
    const responseDeadline = new Date(now.getTime() + responseWindowHours * 60 * 60 * 1000);

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        renterId,
        merchantId: vehicle.merchantId,
        vehicleId: dto.vehicleId,
        source: BookingSource.ONLINE,
        startDate,
        endDate,
        totalPrice,
        renterNotes: dto.renterNotes,
        status: BookingStatus.PENDING,
        responseDeadline,
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
        review: true,
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

  async findMerchantBookings(merchantId: number, source?: BookingSource) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        merchantId,
        ...(source ? { source } : {}),
      },
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
      throw new NotFoundException(ERROR_MESSAGES.BOOKING_NOT_FOUND);
    }

    if (booking.merchantId !== merchantId) {
      throw new ForbiddenException(ERROR_MESSAGES.BOOKING_MANAGE_UNAUTHORIZED);
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

    // Send notification to renter (online bookings only — offline never reaches PENDING)
    if (booking.renter) {
      await this.notificationsService.sendBookingAcceptedEmail(
        booking.renter.email,
        booking.renter.firstName,
        updated,
      );
    }

    return updated;
  }

  async rejectBooking(bookingId: number, merchantId: number, dto?: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { renter: true, vehicle: true },
    });

    if (!booking) {
      throw new NotFoundException(ERROR_MESSAGES.BOOKING_NOT_FOUND);
    }

    if (booking.merchantId !== merchantId) {
      throw new ForbiddenException(ERROR_MESSAGES.BOOKING_MANAGE_UNAUTHORIZED);
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

    if (booking.renter) {
      await this.notificationsService.sendBookingRejectedEmail(
        booking.renter.email,
        booking.renter.firstName,
        updated,
      );
    }

    return updated;
  }

  async completeBooking(bookingId: number, merchantId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { renter: true, vehicle: true },
    });

    if (!booking) {
      throw new NotFoundException(ERROR_MESSAGES.BOOKING_NOT_FOUND);
    }

    if (booking.merchantId !== merchantId) {
      throw new ForbiddenException(ERROR_MESSAGES.BOOKING_MANAGE_UNAUTHORIZED);
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

    // Skip renter email for offline bookings (merchant handles communication in-person)
    if (booking.source === BookingSource.ONLINE && booking.renter) {
      await this.notificationsService.sendBookingCompletedEmail(
        booking.renter.email,
        booking.renter.firstName,
        updated,
      );
    }

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
        ERROR_MESSAGES.BOOKING_CANCEL_WINDOW_EXPIRED.replace(
          '{hours}',
          String(cancellationWindowHours),
        ),
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

  // ---------------------------------------------------------------------------
  // OFFLINE booking flow (merchant-initiated walk-in)
  // ---------------------------------------------------------------------------

  async createOffline(merchantId: number, dto: CreateOfflineBookingDto) {
    // Vehicle ownership check
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(ERROR_MESSAGES.VEHICLE_NOT_FOUND);
    }

    if (vehicle.merchantId !== merchantId) {
      throw new ForbiddenException(ERROR_MESSAGES.BOOKING_VEHICLE_UNAUTHORIZED);
    }

    const createAsCompleted = dto.createAsCompleted === true;

    // Availability check only applies to forward-looking bookings. A merchant
    // should still be allowed to record a past walk-in (createAsCompleted) even
    // if the vehicle has since been disabled.
    if (!createAsCompleted && !vehicle.isAvailable) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_VEHICLE_UNAVAILABLE);
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_DATE_RANGE_INVALID);
    }

    // For ACCEPTED offline bookings, reject past start dates (allow today).
    // Back-dated creations (createAsCompleted=true) may have past dates.
    if (!createAsCompleted) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (startDate < todayStart) {
        throw new BadRequestException(ERROR_MESSAGES.BOOKING_PAST_DATE);
      }
    }

    // Offline bookings share inventory with online bookings. A back-dated
    // COMPLETED entry does not block future dates (it's already finished).
    if (!createAsCompleted) {
      const overlapping = await this.findOverlappingBooking(dto.vehicleId, startDate, endDate);
      if (overlapping) {
        throw new BadRequestException(ERROR_MESSAGES.BOOKING_OVERLAP);
      }
    }

    // Compute default price; allow merchant override for walk-in discounts
    const days = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const computedPrice = Number(vehicle.pricePerDay) * days;
    const totalPrice = dto.totalPrice !== undefined ? dto.totalPrice : computedPrice;

    // Hybrid customer linking: auto-attach renterId if phone matches an existing RENTER
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.offlineCustomerPhone },
    });
    const linkedRenterId =
      existingUser && existingUser.role === Role.RENTER ? existingUser.id : null;

    const now = new Date();
    const status = createAsCompleted ? BookingStatus.COMPLETED : BookingStatus.ACCEPTED;

    const booking = await this.prisma.booking.create({
      data: {
        merchantId,
        vehicleId: dto.vehicleId,
        renterId: linkedRenterId,
        source: BookingSource.OFFLINE,
        startDate,
        endDate,
        totalPrice,
        status,
        acceptedAt: now,
        completedAt: createAsCompleted ? now : null,
        merchantNotes: dto.merchantNotes,
        offlineCustomerName: dto.offlineCustomerName,
        offlineCustomerPhone: dto.offlineCustomerPhone,
        offlineCustomerEmail: dto.offlineCustomerEmail,
        offlineCustomerNotes: dto.offlineCustomerNotes,
        paymentMethod: dto.paymentMethod,
        amountCollected: dto.amountCollected,
        paymentNote: dto.paymentNote,
      },
      include: {
        vehicle: true,
        renter: true,
        merchant: true,
      },
    });

    // Intentionally no notifications: merchant created the booking in-person,
    // and the renter (online or linked) did not initiate it.
    return booking;
  }

  async updateOfflinePayment(
    bookingId: number,
    merchantId: number,
    dto: UpdateOfflinePaymentDto,
  ) {
    await this.getOfflineBookingForMerchant(bookingId, merchantId);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentMethod: dto.paymentMethod,
        amountCollected: dto.amountCollected,
        paymentNote: dto.paymentNote,
      },
      include: {
        vehicle: true,
        renter: true,
        merchant: true,
      },
    });
  }

  async cancelOfflineBooking(bookingId: number, merchantId: number) {
    const booking = await this.getOfflineBookingForMerchant(bookingId, merchantId);

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_OFFLINE_CANCEL_NOT_ALLOWED);
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        vehicle: true,
        renter: true,
        merchant: true,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Merchant stats (includes both online and offline)
  // ---------------------------------------------------------------------------

  async getMerchantStats(merchantId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const earningStatuses = {
      in: [BookingStatus.ACCEPTED, BookingStatus.COMPLETED],
    };

    const [
      currentMonthEarnings,
      totalEarnings,
      activeBookingsCount,
      totalBookingsCount,
      onlineEarnings,
      offlineEarnings,
      offlineCollected,
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          merchantId,
          status: earningStatuses,
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
        where: { merchantId },
      }),
      this.prisma.booking.aggregate({
        where: {
          merchantId,
          source: BookingSource.ONLINE,
          status: BookingStatus.COMPLETED,
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          merchantId,
          source: BookingSource.OFFLINE,
          status: BookingStatus.COMPLETED,
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          merchantId,
          source: BookingSource.OFFLINE,
        },
        _sum: { amountCollected: true },
      }),
    ]);

    return {
      currentMonthEarnings: Number(currentMonthEarnings._sum.totalPrice || 0),
      totalEarnings: Number(totalEarnings._sum.totalPrice || 0),
      onlineEarnings: Number(onlineEarnings._sum.totalPrice || 0),
      offlineEarnings: Number(offlineEarnings._sum.totalPrice || 0),
      offlineAmountCollected: Number(offlineCollected._sum.amountCollected || 0),
      activeBookingsCount,
      totalBookingsCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Unified vehicle availability check — shared by online and offline flows
   * so both channels block each other on overlapping dates. Considers
   * PENDING + ACCEPTED bookings (i.e. anything actively holding the vehicle).
   */
  private findOverlappingBooking(vehicleId: number, startDate: Date, endDate: Date) {
    return this.prisma.booking.findFirst({
      where: {
        vehicleId,
        status: { in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
  }

  private async getOfflineBookingForMerchant(bookingId: number, merchantId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(ERROR_MESSAGES.BOOKING_NOT_FOUND);
    }

    if (booking.merchantId !== merchantId) {
      throw new ForbiddenException(ERROR_MESSAGES.BOOKING_MANAGE_UNAUTHORIZED);
    }

    if (booking.source !== BookingSource.OFFLINE) {
      throw new BadRequestException(ERROR_MESSAGES.BOOKING_OFFLINE_ONLY);
    }

    return booking;
  }
}
