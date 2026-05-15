import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { MessagingModule } from "../messaging/messaging.module";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [MessagingModule, UploadsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
