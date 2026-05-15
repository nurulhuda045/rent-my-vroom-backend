import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationEvent,
  BookingEmailPayload,
  renderLicenseApproved,
  renderLicenseRejected,
  renderKycApproved,
  renderKycRejected,
  renderNewBookingMerchant,
  renderBookingAccepted,
  renderBookingRejected,
  renderBookingCompleted,
  renderBookingCancelledMerchant,
  renderBookingAutoCancelledRenter,
  renderBookingAutoCancelledMerchant,
} from '../notifications/templates';
import { WHATSAPP_TRANSACTIONAL_TEMPLATE_ENV } from './whatsapp-transactional-env';
import { PhoneUtils } from '../common';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /**
   * Sends WhatsApp template when env maps an approved Meta template name.
   * Parameter order must match the template registered in Meta Business Manager.
   */
  private async sendTransactionalWa(
    event: NotificationEvent,
    phone: string | null | undefined,
    parameters: string[],
  ): Promise<void> {
    const envKey = WHATSAPP_TRANSACTIONAL_TEMPLATE_ENV[event];
    if (!envKey) return;

    const templateName = this.config.get<string>(envKey)?.trim();
    if (!templateName || !phone?.trim()) return;

    if (!PhoneUtils.isValidE164(phone)) {
      this.logger.warn(`Skipping WhatsApp ${event}: invalid E.164 phone`);
      return;
    }

    try {
      await this.whatsapp.sendTemplateMessage(phone, templateName, parameters);
      this.logger.log(`WhatsApp ${event} sent to ${phone}`);
    } catch (error) {
      this.logger.error(`WhatsApp ${event} failed for ${phone}:`, error);
    }
  }

  private bookingLines(booking: BookingEmailPayload): {
    vehicle: string;
    start: string;
    end: string;
    price: string;
  } {
    const vehicle = `${booking.vehicle?.make ?? ''} ${booking.vehicle?.model ?? ''}`.trim();
    return {
      vehicle,
      start: new Date(booking.startDate).toLocaleDateString(),
      end: new Date(booking.endDate).toLocaleDateString(),
      price: String(booking.totalPrice ?? ''),
    };
  }

  async notifyLicenseApproved(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
  ): Promise<void> {
    const { subject, html } = renderLicenseApproved(firstName);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    await this.sendTransactionalWa(NotificationEvent.LICENSE_APPROVED, phone, [
      firstName?.trim() || 'there',
    ]);
  }

  async notifyLicenseRejected(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
  ): Promise<void> {
    const { subject, html } = renderLicenseRejected(firstName);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    await this.sendTransactionalWa(NotificationEvent.LICENSE_REJECTED, phone, [
      firstName?.trim() || 'there',
    ]);
  }

  async notifyKycApproved(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
  ): Promise<void> {
    const { subject, html } = renderKycApproved(firstName);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    await this.sendTransactionalWa(NotificationEvent.KYC_APPROVED, phone, [
      firstName?.trim() || 'there',
    ]);
  }

  async notifyKycRejected(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
    reason: string,
  ): Promise<void> {
    const { subject, html } = renderKycRejected(firstName, reason);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    await this.sendTransactionalWa(NotificationEvent.KYC_REJECTED, phone, [
      firstName?.trim() || 'there',
      reason,
    ]);
  }

  async notifyNewBookingMerchant(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
    booking: BookingEmailPayload,
  ): Promise<void> {
    const { subject, html } = renderNewBookingMerchant(firstName, booking);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    const { vehicle, start, end, price } = this.bookingLines(booking);
    await this.sendTransactionalWa(NotificationEvent.BOOKING_NEW_MERCHANT, phone, [
      firstName?.trim() || 'there',
      vehicle,
      start,
      end,
      price,
    ]);
  }

  async notifyBookingAccepted(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
    booking: BookingEmailPayload,
  ): Promise<void> {
    const { subject, html } = renderBookingAccepted(firstName, booking);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    const { vehicle, start, end, price } = this.bookingLines(booking);
    await this.sendTransactionalWa(NotificationEvent.BOOKING_ACCEPTED_RENTER, phone, [
      firstName?.trim() || 'there',
      vehicle,
      start,
      end,
      price,
    ]);
  }

  async notifyBookingRejected(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
    booking: BookingEmailPayload,
  ): Promise<void> {
    const { subject, html } = renderBookingRejected(firstName, booking);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    const { vehicle, start, end } = this.bookingLines(booking);
    await this.sendTransactionalWa(NotificationEvent.BOOKING_REJECTED_RENTER, phone, [
      firstName?.trim() || 'there',
      vehicle,
      start,
      end,
    ]);
  }

  async notifyBookingCompleted(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
    booking: BookingEmailPayload,
  ): Promise<void> {
    const { subject, html } = renderBookingCompleted(firstName, booking);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    const { vehicle } = this.bookingLines(booking);
    await this.sendTransactionalWa(NotificationEvent.BOOKING_COMPLETED_RENTER, phone, [
      firstName?.trim() || 'there',
      vehicle,
    ]);
  }

  async notifyBookingCancelledMerchant(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
    booking: BookingEmailPayload,
  ): Promise<void> {
    const { subject, html } = renderBookingCancelledMerchant(firstName, booking);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    const { vehicle, start, end } = this.bookingLines(booking);
    await this.sendTransactionalWa(NotificationEvent.BOOKING_CANCELLED_MERCHANT, phone, [
      firstName?.trim() || 'there',
      vehicle,
      start,
      end,
    ]);
  }

  async notifyBookingAutoCancelledRenter(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
    booking: BookingEmailPayload,
  ): Promise<void> {
    const { subject, html } = renderBookingAutoCancelledRenter(firstName, booking);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    const { vehicle } = this.bookingLines(booking);
    await this.sendTransactionalWa(NotificationEvent.BOOKING_AUTO_CANCEL_RENTER, phone, [
      firstName?.trim() || 'there',
      vehicle,
    ]);
  }

  async notifyBookingAutoCancelledMerchant(
    email: string | null | undefined,
    firstName: string | null | undefined,
    phone: string | null | undefined,
    booking: BookingEmailPayload,
  ): Promise<void> {
    const { subject, html } = renderBookingAutoCancelledMerchant(firstName, booking);
    await this.notifications.sendTransactionalEmail(email, subject, html);
    const { vehicle } = this.bookingLines(booking);
    await this.sendTransactionalWa(NotificationEvent.BOOKING_AUTO_CANCEL_MERCHANT, phone, [
      firstName?.trim() || 'there',
      vehicle,
    ]);
  }
}
