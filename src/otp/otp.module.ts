import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OTPService } from './otp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, PrismaModule, WhatsAppModule],
  providers: [OTPService],
  exports: [OTPService],
})
export class OTPModule {}
