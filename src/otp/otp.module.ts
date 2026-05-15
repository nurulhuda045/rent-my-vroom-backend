import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OTPService } from './otp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, PrismaModule, WhatsAppModule, NotificationsModule],
  providers: [OTPService],
  exports: [OTPService],
})
export class OTPModule {}
