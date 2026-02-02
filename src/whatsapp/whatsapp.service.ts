import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { PhoneUtils, WHATSAPP_CONFIG, ERROR_MESSAGES, OTP_CONFIG } from '../common';

interface WhatsAppErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.apiVersion = this.configService.get<string>(
      'WHATSAPP_API_VERSION',
      WHATSAPP_CONFIG.API_VERSION,
    );
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn(ERROR_MESSAGES.WHATSAPP_NOT_CONFIGURED);
    }
  }

  /**
   * Send OTP message via WhatsApp
   */
  async sendOTPMessage(phone: string, otp: string): Promise<string> {
    this.validateConfiguration();
    this.validatePhone(phone);

    const payload = this.buildOTPPayload(phone, otp);

    try {
      const response = await this.sendMessage(payload);
      this.logger.log(`WhatsApp OTP sent to ${phone}, Message ID: ${response.messages[0].id}`);
      return response.messages[0].id;
    } catch (error) {
      this.handleWhatsAppError(error);
    }
  }

  /**
   * Send template message via WhatsApp
   */
  async sendTemplateMessage(
    phone: string,
    templateName: string,
    parameters: string[],
    languageCode: string = WHATSAPP_CONFIG.TEMPLATE_LANGUAGE,
  ): Promise<string> {
    this.validateConfiguration();
    this.validatePhone(phone);

    const payload = this.buildTemplatePayload(phone, templateName, parameters, languageCode);

    try {
      const response = await this.sendMessage(payload);
      this.logger.log(`WhatsApp template sent to ${phone}, Message ID: ${response.messages[0].id}`);
      return response.messages[0].id;
    } catch (error) {
      this.handleWhatsAppError(error);
    }
  }

  // Private helper methods

  /**
   * Validate WhatsApp configuration
   */
  private validateConfiguration(): void {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new HttpException(
        ERROR_MESSAGES.WHATSAPP_NOT_CONFIGURED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate phone number format
   */
  private validatePhone(phone: string): void {
    if (!PhoneUtils.isValidE164(phone)) {
      throw new HttpException(ERROR_MESSAGES.WHATSAPP_INVALID_PHONE, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Build OTP message payload
   */
  private buildOTPPayload(phone: string, otp: string) {
    return {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: WHATSAPP_CONFIG.OTP_TEMPLATE_NAME,
        language: { code: WHATSAPP_CONFIG.TEMPLATE_LANGUAGE },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: otp },
              { type: 'text', text: OTP_CONFIG.EXPIRY_MINUTES.toString() },
            ],
          },
        ],
      },
    };
  }

  /**
   * Build template message payload
   */
  private buildTemplatePayload(
    phone: string,
    templateName: string,
    parameters: string[],
    languageCode: string,
  ) {
    return {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: parameters.map((param) => ({
              type: 'text',
              text: param,
            })),
          },
        ],
      },
    };
  }

  /**
   * Send message to WhatsApp API
   */
  private async sendMessage(payload: any) {
    const response = await axios.post(this.baseUrl, payload, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }

  /**
   * Handle WhatsApp API errors
   */
  private handleWhatsAppError(error: any): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<WhatsAppErrorResponse>;
      const errorData = axiosError.response?.data?.error;

      if (errorData) {
        this.logger.error('WhatsApp API Error:', {
          message: errorData.message,
          type: errorData.type,
          code: errorData.code,
          subcode: errorData.error_subcode,
          traceId: errorData.fbtrace_id,
        });

        throw new HttpException(
          `WhatsApp Error: ${errorData.message || ERROR_MESSAGES.WHATSAPP_SEND_FAILED}`,
          axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    this.logger.error('Unknown WhatsApp error:', error);
    throw new HttpException(ERROR_MESSAGES.WHATSAPP_SEND_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
