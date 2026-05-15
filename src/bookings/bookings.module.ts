import { Module } from "@nestjs/common";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { MessagingModule } from "../messaging/messaging.module";
import { SystemConfigModule } from "../system-config/system-config.module";

@Module({
  imports: [MessagingModule, SystemConfigModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
