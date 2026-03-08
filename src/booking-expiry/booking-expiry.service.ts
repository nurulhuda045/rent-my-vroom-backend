import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingStatus } from '../generated/prisma/client';

/**
 * Handles automatic cancellation of bookings that have exceeded the merchant
 * response window without any action.
 *
 * Response windows (set at booking creation time and stored in `responseDeadline`):
 *   - Same-day booking (start date is today) → 1 hour
 *   - Future booking                         → 24 hours
 *
 * ---
 * MIGRATION NOTE — switching to a queue (Bull / BullMQ):
 *   1. Remove the @Cron decorator from `handleExpiredBookings`.
 *   2. Create a Bull processor class and call `this.processExpiredBookings()`
 *      from its `process()` method.
 *   3. Schedule a repeating job on application bootstrap instead of relying
 *      on the cron scheduler.
 *   The core logic in `processExpiredBookings` stays entirely unchanged.
 */
@Injectable()
export class BookingExpiryService {
  private readonly logger = new Logger(BookingExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Cron entry-point — runs every minute.
   * Delegates all business logic to `processExpiredBookings` so the method
   * can also be called from a queue processor without modification.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredBookings(): Promise<void> {
    await this.processExpiredBookings();
  }

  /**
   * Finds all PENDING bookings whose `responseDeadline` has passed and
   * cancels them, then notifies both the renter and the merchant.
   *
   * This method is intentionally decoupled from the scheduler so it can be
   * invoked from a queue processor, a test, or a manual admin endpoint.
   */
  async processExpiredBookings(): Promise<void> {
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        responseDeadline: { lt: new Date() },
      },
      include: {
        renter: true,
        merchant: true,
        vehicle: true,
      },
    });

    if (expiredBookings.length === 0) return;

    this.logger.log(`Auto-cancelling ${expiredBookings.length} expired booking(s)`);

    // Process each booking independently so one failure does not block others
    await Promise.allSettled(expiredBookings.map((booking) => this.expireBooking(booking)));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async expireBooking(booking: {
    id: number;
    renter: { email: string; firstName: string };
    merchant: { email: string; firstName: string };
    vehicle: { make: string; model: string };
    startDate: Date;
    endDate: Date;
    totalPrice: any;
  }): Promise<void> {
    try {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason:
            'Auto-cancelled: merchant did not respond within the response window.',
        },
      });

      // Notify both parties in parallel — failures are caught individually
      await Promise.allSettled([
        this.notifications.sendBookingAutoCancelledRenterEmail(
          booking.renter.email,
          booking.renter.firstName,
          booking,
        ),
        this.notifications.sendBookingAutoCancelledMerchantEmail(
          booking.merchant.email,
          booking.merchant.firstName,
          booking,
        ),
      ]);

      this.logger.log(`Booking #${booking.id} auto-cancelled (no merchant response)`);
    } catch (error) {
      this.logger.error(`Failed to auto-cancel booking #${booking.id}`, error);
    }
  }
}
