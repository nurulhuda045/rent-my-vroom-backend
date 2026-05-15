import { Module } from '@nestjs/common';
import { BookingExpiryService } from './booking-expiry.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [PrismaModule, MessagingModule],
  providers: [BookingExpiryService],
})
export class BookingExpiryModule {}
