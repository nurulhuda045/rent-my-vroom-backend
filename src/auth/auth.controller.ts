import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RefreshTokenDto,
  SendOTPDto,
  VerifyOTPDto,
  CompleteRenterProfileDto,
  CompleteMerchantProfileDto,
  SubmitKYCDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // WhatsApp OTP Authentication Endpoints

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number via WhatsApp' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Too many OTP requests - resend cooldown active' })
  async sendOTP(@Body() dto: SendOTPDto) {
    return this.authService.sendOTP(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and authenticate user' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully, user authenticated' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOTP(@Body() dto: VerifyOTPDto) {
    return this.authService.verifyOTPAndAuthenticate(dto);
  }

  @Post('complete-profile/renter')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete renter profile after OTP verification' })
  @ApiResponse({ status: 200, description: 'Profile completed successfully' })
  @ApiResponse({ status: 409, description: 'Invalid registration step' })
  async completeRenterProfile(
    @GetUser('id') userId: number,
    @Body() dto: CompleteRenterProfileDto,
  ) {
    return this.authService.completeRenterProfile(userId, dto);
  }

  @Post('complete-profile/merchant')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete merchant profile with address after OTP verification' })
  @ApiResponse({ status: 200, description: 'Profile completed successfully' })
  @ApiResponse({ status: 409, description: 'Invalid registration step' })
  async completeMerchantProfile(
    @GetUser('id') userId: number,
    @Body() dto: CompleteMerchantProfileDto,
  ) {
    return this.authService.completeMerchantProfile(userId, dto);
  }

  @Post('submit-kyc')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit KYC documents for renters' })
  @ApiResponse({ status: 200, description: 'KYC submitted successfully' })
  @ApiResponse({ status: 409, description: 'KYC already submitted or invalid step' })
  async submitKYC(@GetUser('id') userId: number, @Body() dto: SubmitKYCDto) {
    return this.authService.submitKYC(userId, dto);
  }

  @Get('registration-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current registration status and next step' })
  @ApiResponse({ status: 200, description: 'Registration status retrieved' })
  async getRegistrationStatus(@GetUser('id') userId: number) {
    return this.authService.getRegistrationStatus(userId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'User successfully logged out' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@GetUser() user: any) {
    return user;
  }
}
