import { Module } from '@nestjs/common';
import { BookingExpiryService } from './booking-expiry.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [BookingExpiryService],
})
export class BookingExpiryModule {}
