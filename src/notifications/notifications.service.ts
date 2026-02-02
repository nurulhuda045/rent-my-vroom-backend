import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: parseInt(this.config.get('SMTP_PORT') || '587'),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.config.get('EMAIL_FROM'),
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      // Don't throw error to prevent blocking the main flow
    }
  }

  async sendLicenseApprovalEmail(email: string, firstName: string) {
    const subject = 'Your Driving License Has Been Approved!';
    const html = `
      <h1>Congratulations, ${firstName}!</h1>
      <p>Your driving license has been approved. You can now start booking vehicles on RentMyVroom.</p>
      <p>Happy renting!</p>
      <p>Best regards,<br>The RentMyVroom Team</p>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendNewBookingEmail(email: string, firstName: string, booking: any) {
    const subject = 'New Booking Request Received';
    const html = `
      <h1>Hello ${firstName},</h1>
      <p>You have received a new booking request for your vehicle:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${booking.vehicle.make} ${booking.vehicle.model}</li>
        <li><strong>Start Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(booking.endDate).toLocaleDateString()}</li>
        <li><strong>Total Price:</strong> $${booking.totalPrice}</li>
      </ul>
      <p>Please log in to your account to accept or reject this booking.</p>
      <p>Best regards,<br>The RentMyVroom Team</p>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendBookingAcceptedEmail(email: string, firstName: string, booking: any) {
    const subject = 'Your Booking Has Been Accepted!';
    const html = `
      <h1>Great news, ${firstName}!</h1>
      <p>Your booking request has been accepted:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${booking.vehicle.make} ${booking.vehicle.model}</li>
        <li><strong>Start Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(booking.endDate).toLocaleDateString()}</li>
        <li><strong>Total Price:</strong> $${booking.totalPrice}</li>
      </ul>
      ${booking.merchantNotes ? `<p><strong>Merchant Notes:</strong> ${booking.merchantNotes}</p>` : ''}
      <p>Please contact the merchant to arrange pickup details.</p>
      <p>Best regards,<br>The RentMyVroom Team</p>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendBookingRejectedEmail(email: string, firstName: string, booking: any) {
    const subject = 'Booking Request Update';
    const html = `
      <h1>Hello ${firstName},</h1>
      <p>Unfortunately, your booking request has been declined:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${booking.vehicle.make} ${booking.vehicle.model}</li>
        <li><strong>Start Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(booking.endDate).toLocaleDateString()}</li>
      </ul>
      ${booking.merchantNotes ? `<p><strong>Merchant Notes:</strong> ${booking.merchantNotes}</p>` : ''}
      <p>Please browse other available vehicles on our platform.</p>
      <p>Best regards,<br>The RentMyVroom Team</p>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendBookingCompletedEmail(email: string, firstName: string, booking: any) {
    const subject = 'Booking Completed - Please Leave a Review';
    const html = `
      <h1>Hello ${firstName},</h1>
      <p>Your rental has been marked as completed:</p>
      <ul>
        <li><strong>Vehicle:</strong> ${booking.vehicle.make} ${booking.vehicle.model}</li>
        <li><strong>Start Date:</strong> ${new Date(booking.startDate).toLocaleDateString()}</li>
        <li><strong>End Date:</strong> ${new Date(booking.endDate).toLocaleDateString()}</li>
      </ul>
      <p>We hope you had a great experience! Please consider leaving a review for the merchant.</p>
      <p>Best regards,<br>The RentMyVroom Team</p>
    `;

    await this.sendEmail(email, subject, html);
  }
}
