import { IsEmail, IsString, MinLength, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client';

// WhatsApp OTP Authentication DTOs

export class SendOTPDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone number in E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +919876543210)',
  })
  phone: string;

  @ApiProperty({ enum: Role, example: Role.RENTER, description: 'User role: RENTER or MERCHANT' })
  @IsEnum(Role)
  role: Role;
}

export class VerifyOTPDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone number in E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in E.164 format' })
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @MinLength(6)
  otp: string;

  @ApiProperty({ enum: Role, example: Role.RENTER, description: 'User role: RENTER or MERCHANT' })
  @IsEnum(Role)
  role: Role;
}

export class CompleteRenterProfileDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    required: false,
    description: 'Email is optional',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CompleteMerchantProfileDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    required: false,
    description: 'Email is optional',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'My Business' })
  @IsString()
  businessName: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  addressLine1: string;

  @ApiProperty({ example: 'Suite 100', required: false })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  state: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  postalCode: string;

  @ApiProperty({ example: 'USA' })
  @IsString()
  country: string;

  @ApiProperty({ example: 40.7128, required: false })
  @IsOptional()
  latitude?: number;

  @ApiProperty({ example: -74.006, required: false })
  @IsOptional()
  longitude?: number;
}

export class SubmitKYCDto {
  @ApiProperty({ example: 'DL1234567890' })
  @IsString()
  licenseNumber: string;

  @ApiProperty({ example: 'https://example.com/license.jpg' })
  @IsString()
  licenseImageUrl: string;

  @ApiProperty({ example: '2025-12-31', description: 'License expiry date in YYYY-MM-DD format' })
  @IsString()
  licenseExpiryDate: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
