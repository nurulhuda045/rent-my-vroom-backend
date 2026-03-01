import { Module } from "@nestjs/common";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { SystemConfigModule } from "../system-config/system-config.module";

@Module({
  imports: [NotificationsModule, SystemConfigModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
