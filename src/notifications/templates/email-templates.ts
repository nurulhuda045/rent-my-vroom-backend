import { escapeHtml } from './html-escape';

/** Minimal booking shape used by notification templates */
export type BookingEmailPayload = {
  startDate: Date | string;
  endDate: Date | string;
  totalPrice: unknown;
  merchantNotes?: string | null;
  vehicle: { make?: string | null; model?: string | null };
};

function greeting(firstName: string | null | undefined): string {
  const name = firstName?.trim();
  return name ? escapeHtml(name) : 'there';
}

function footer(): string {
  return `<p style="margin-top:24px;color:#666;">Best regards,<br>The RentMyVroom Team</p>`;
}

export function renderOtpEmail(otp: string, expiryMinutes: number): { subject: string; html: string } {
  const subject = 'Your RentMyVroom verification code';
  const html = `
    <p>Hello,</p>
    <p>Your verification code is <strong>${escapeHtml(otp)}</strong>.</p>
    <p>This code expires in ${expiryMinutes} minute${expiryMinutes === 1 ? '' : 's'}.</p>
    <p>If you did not request this code, you can ignore this email.</p>
    ${footer()}
  `;
  return { subject, html };
}

export function renderLicenseApproved(firstName: string | null | undefined): {
  subject: string;
  html: string;
} {
  const subject = 'Your Driving License Has Been Approved!';
  const html = `
      <h1>Congratulations, ${greeting(firstName)}!</h1>
      <p>Your driving license has been approved. You can now start booking vehicles on RentMyVroom.</p>
      <p>Happy renting!</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderLicenseRejected(firstName: string | null | undefined): {
  subject: string;
  html: string;
} {
  const subject = 'Driving License Application Update';
  const html = `
      <h1>Hello ${greeting(firstName)},</h1>
      <p>Your driving license submission could not be approved at this time.</p>
      <p>Please review your documents and upload a new license through the app if you wish to continue.</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderKycApproved(firstName: string | null | undefined): {
  subject: string;
  html: string;
} {
  const subject = 'Your identity verification was approved';
  const html = `
      <h1>Great news, ${greeting(firstName)}!</h1>
      <p>Your KYC submission has been approved. You can continue onboarding in the app.</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderKycRejected(
  firstName: string | null | undefined,
  reason: string,
): { subject: string; html: string } {
  const subject = 'Identity verification update';
  const html = `
      <h1>Hello ${greeting(firstName)},</h1>
      <p>Your KYC submission could not be approved.</p>
      <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p>You may update your details and resubmit from the app.</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderNewBookingMerchant(
  firstName: string | null | undefined,
  booking: BookingEmailPayload,
): { subject: string; html: string } {
  const subject = 'New Booking Request Received';
  const html = `
      <h1>Hello ${greeting(firstName)},</h1>
      <p>You have received a new booking request for your vehicle:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(`${booking.vehicle.make ?? ''} ${booking.vehicle.model ?? ''}`.trim())}</li>
        <li><strong>Start Date:</strong> ${escapeHtml(new Date(booking.startDate).toLocaleDateString())}</li>
        <li><strong>End Date:</strong> ${escapeHtml(new Date(booking.endDate).toLocaleDateString())}</li>
        <li><strong>Total Price:</strong> $${escapeHtml(String(booking.totalPrice))}</li>
      </ul>
      <p>Please log in to your account to accept or reject this booking.</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderBookingAccepted(
  firstName: string | null | undefined,
  booking: BookingEmailPayload,
): { subject: string; html: string } {
  const subject = 'Your Booking Has Been Accepted!';
  const notes = booking.merchantNotes;
  const html = `
      <h1>Great news, ${greeting(firstName)}!</h1>
      <p>Your booking request has been accepted:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(`${booking.vehicle.make ?? ''} ${booking.vehicle.model ?? ''}`.trim())}</li>
        <li><strong>Start Date:</strong> ${escapeHtml(new Date(booking.startDate).toLocaleDateString())}</li>
        <li><strong>End Date:</strong> ${escapeHtml(new Date(booking.endDate).toLocaleDateString())}</li>
        <li><strong>Total Price:</strong> $${escapeHtml(String(booking.totalPrice))}</li>
      </ul>
      ${notes ? `<p><strong>Merchant Notes:</strong> ${escapeHtml(String(notes))}</p>` : ''}
      <p>Please contact the merchant to arrange pickup details.</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderBookingRejected(
  firstName: string | null | undefined,
  booking: BookingEmailPayload,
): { subject: string; html: string } {
  const subject = 'Booking Request Update';
  const notes = booking.merchantNotes;
  const html = `
      <h1>Hello ${greeting(firstName)},</h1>
      <p>Unfortunately, your booking request has been declined:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(`${booking.vehicle.make ?? ''} ${booking.vehicle.model ?? ''}`.trim())}</li>
        <li><strong>Start Date:</strong> ${escapeHtml(new Date(booking.startDate).toLocaleDateString())}</li>
        <li><strong>End Date:</strong> ${escapeHtml(new Date(booking.endDate).toLocaleDateString())}</li>
      </ul>
      ${notes ? `<p><strong>Merchant Notes:</strong> ${escapeHtml(String(notes))}</p>` : ''}
      <p>Please browse other available vehicles on our platform.</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderBookingCancelledMerchant(
  firstName: string | null | undefined,
  booking: BookingEmailPayload,
): { subject: string; html: string } {
  const subject = 'Booking Cancelled';
  const html = `
      <h1>Hello ${greeting(firstName)},</h1>
      <p>A booking has been cancelled by the renter:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(`${booking.vehicle.make ?? ''} ${booking.vehicle.model ?? ''}`.trim())}</li>
        <li><strong>Start Date:</strong> ${escapeHtml(new Date(booking.startDate).toLocaleDateString())}</li>
        <li><strong>End Date:</strong> ${escapeHtml(new Date(booking.endDate).toLocaleDateString())}</li>
        <li><strong>Total Price:</strong> $${escapeHtml(String(booking.totalPrice))}</li>
      </ul>
      <p>The vehicle is now available for other bookings.</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderBookingCompleted(
  firstName: string | null | undefined,
  booking: BookingEmailPayload,
): { subject: string; html: string } {
  const subject = 'Booking Completed - Please Leave a Review';
  const html = `
      <h1>Hello ${greeting(firstName)},</h1>
      <p>Your rental has been marked as completed:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(`${booking.vehicle.make ?? ''} ${booking.vehicle.model ?? ''}`.trim())}</li>
        <li><strong>Start Date:</strong> ${escapeHtml(new Date(booking.startDate).toLocaleDateString())}</li>
        <li><strong>End Date:</strong> ${escapeHtml(new Date(booking.endDate).toLocaleDateString())}</li>
      </ul>
      <p>We hope you had a great experience! Please consider leaving a review for the merchant.</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderBookingAutoCancelledRenter(
  firstName: string | null | undefined,
  booking: BookingEmailPayload,
): { subject: string; html: string } {
  const subject = 'Your Booking Was Automatically Cancelled';
  const html = `
      <h1>Hello ${greeting(firstName)},</h1>
      <p>Unfortunately, your booking was automatically cancelled because the merchant did not respond within the required time window.</p>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(`${booking.vehicle.make ?? ''} ${booking.vehicle.model ?? ''}`.trim())}</li>
        <li><strong>Start Date:</strong> ${escapeHtml(new Date(booking.startDate).toLocaleDateString())}</li>
        <li><strong>End Date:</strong> ${escapeHtml(new Date(booking.endDate).toLocaleDateString())}</li>
        <li><strong>Total Price:</strong> $${escapeHtml(String(booking.totalPrice))}</li>
      </ul>
      <p>We apologise for the inconvenience. Please browse other available vehicles on our platform.</p>
      ${footer()}
    `;
  return { subject, html };
}

export function renderBookingAutoCancelledMerchant(
  firstName: string | null | undefined,
  booking: BookingEmailPayload,
): { subject: string; html: string } {
  const subject = 'Booking Expired — No Response Recorded';
  const html = `
      <h1>Hello ${greeting(firstName)},</h1>
      <p>A booking request for your vehicle was automatically cancelled because it was not accepted or rejected within the required response window.</p>
      <ul>
        <li><strong>Vehicle:</strong> ${escapeHtml(`${booking.vehicle.make ?? ''} ${booking.vehicle.model ?? ''}`.trim())}</li>
        <li><strong>Start Date:</strong> ${escapeHtml(new Date(booking.startDate).toLocaleDateString())}</li>
        <li><strong>End Date:</strong> ${escapeHtml(new Date(booking.endDate).toLocaleDateString())}</li>
        <li><strong>Total Price:</strong> $${escapeHtml(String(booking.totalPrice))}</li>
      </ul>
      <p>To avoid missing future bookings, please respond to requests promptly — within <strong>1 hour</strong> for same-day bookings and <strong>24 hours</strong> for future bookings.</p>
      ${footer()}
    `;
  return { subject, html };
}
