import { NotificationEvent } from '../notifications/templates';

/**
 * Optional Meta Cloud API template names — set each env to your approved template name.
 * Body parameter order must match your Meta template (see MessagingService call sites).
 */
export const WHATSAPP_TRANSACTIONAL_TEMPLATE_ENV: Partial<Record<NotificationEvent, string>> = {
  [NotificationEvent.LICENSE_APPROVED]: 'WHATSAPP_TMPL_LICENSE_APPROVED',
  [NotificationEvent.LICENSE_REJECTED]: 'WHATSAPP_TMPL_LICENSE_REJECTED',
  [NotificationEvent.KYC_APPROVED]: 'WHATSAPP_TMPL_KYC_APPROVED',
  [NotificationEvent.KYC_REJECTED]: 'WHATSAPP_TMPL_KYC_REJECTED',
  [NotificationEvent.BOOKING_NEW_MERCHANT]: 'WHATSAPP_TMPL_BOOKING_NEW_MERCHANT',
  [NotificationEvent.BOOKING_ACCEPTED_RENTER]: 'WHATSAPP_TMPL_BOOKING_ACCEPTED_RENTER',
  [NotificationEvent.BOOKING_REJECTED_RENTER]: 'WHATSAPP_TMPL_BOOKING_REJECTED_RENTER',
  [NotificationEvent.BOOKING_COMPLETED_RENTER]: 'WHATSAPP_TMPL_BOOKING_COMPLETED_RENTER',
  [NotificationEvent.BOOKING_CANCELLED_MERCHANT]: 'WHATSAPP_TMPL_BOOKING_CANCELLED_MERCHANT',
  [NotificationEvent.BOOKING_AUTO_CANCEL_RENTER]: 'WHATSAPP_TMPL_BOOKING_AUTO_CANCEL_RENTER',
  [NotificationEvent.BOOKING_AUTO_CANCEL_MERCHANT]: 'WHATSAPP_TMPL_BOOKING_AUTO_CANCEL_MERCHANT',
};
