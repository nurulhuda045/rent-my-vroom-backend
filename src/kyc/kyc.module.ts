import { Module } from '@nestjs/common';
import { KYCService } from './kyc.service';
import { KYCController } from './kyc.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KYCController],
  providers: [KYCService],
  exports: [KYCService],
})
export class KYCModule {}
