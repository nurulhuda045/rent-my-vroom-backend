import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OTPModule } from '../otp/otp.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // Configuration is done in the service
    OTPModule,
    UploadsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
