import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { renderOtpEmail } from './templates/email-templates';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly brevo: BrevoClient | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    this.brevo = apiKey ? new BrevoClient({ apiKey }) : null;
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY is not set — transactional emails will be skipped');
    }
  }

  /**
   * Low-level send used by MessagingService and OTP email fallback.
   */
  async sendTransactionalEmail(
    to: string | null | undefined,
    subject: string,
    html: string,
  ): Promise<void> {
    const trimmed = to?.trim();
    if (!trimmed) {
      this.logger.debug('Skipping transactional email: no recipient address');
      return;
    }

    if (!this.brevo) {
      this.logger.warn('BREVO_API_KEY not configured; transactional email skipped');
      return;
    }

    const from = this.config.get<string>('EMAIL_FROM');
    if (!from?.trim()) {
      this.logger.warn('EMAIL_FROM not configured; transactional email skipped');
      return;
    }

    const fromName = this.config.get<string>('EMAIL_FROM_NAME') ?? 'RentMyVroom';

    try {
      await this.brevo.transactionalEmails.sendTransacEmail({
        subject,
        htmlContent: html,
        sender: { email: from.trim(), name: fromName },
        to: [{ email: trimmed }],
      });
    } catch (error) {
      this.logger.error('Failed to send transactional email:', error);
    }
  }

  async sendOtpEmail(
    to: string | null | undefined,
    otp: string,
    expiryMinutes: number,
  ): Promise<void> {
    const { subject, html } = renderOtpEmail(otp, expiryMinutes);
    await this.sendTransactionalEmail(to, subject, html);
  }
}
