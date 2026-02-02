import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  private readonly verifyToken: string;

  constructor(private configService: ConfigService) {
    this.verifyToken = this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

    if (!this.verifyToken) {
      this.logger.warn('WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured');
    }
  }

  /**
   * Webhook verification endpoint (GET)
   * Meta will call this endpoint to verify the webhook
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    this.logger.log('Webhook verification request received');

    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.error('Webhook verification failed');
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  /**
   * Webhook event handler (POST)
   * Receives message status updates from WhatsApp
   */
  @Post('webhook')
  async handleWebhook(@Body() body: any): Promise<{ status: string }> {
    this.logger.log('Webhook event received');
    this.logger.debug('Webhook payload:', JSON.stringify(body, null, 2));

    try {
      // Verify this is a WhatsApp webhook
      if (body.object !== 'whatsapp_business_account') {
        this.logger.warn('Invalid webhook object type');
        return { status: 'ignored' };
      }

      // Process each entry
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            await this.handleMessageEvent(change.value);
          }
        }
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      // Return 200 to prevent Meta from retrying
      return { status: 'error' };
    }
  }

  /**
   * Handle message events (status updates, incoming messages)
   */
  private async handleMessageEvent(value: any): Promise<void> {
    // Handle message status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        this.logger.log(`Message ${status.id} status: ${status.status}`);

        switch (status.status) {
          case 'sent':
            this.logger.log(`Message sent to WhatsApp server`);
            break;
          case 'delivered':
            this.logger.log(`Message delivered to recipient`);
            break;
          case 'read':
            this.logger.log(`Message read by recipient`);
            break;
          case 'failed':
            this.logger.error(`Message delivery failed:`, status.errors);
            // TODO: Update OTP record in database to mark as failed
            break;
        }
      }
    }

    // Handle incoming messages (if needed)
    if (value.messages) {
      for (const message of value.messages) {
        this.logger.log(`Incoming message from ${message.from}: ${message.text?.body}`);
        // TODO: Handle incoming messages if needed
      }
    }
  }
}
