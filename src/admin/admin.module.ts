import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { KYCModule } from '../kyc/kyc.module';

@Module({
  imports: [UsersModule, KYCModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
