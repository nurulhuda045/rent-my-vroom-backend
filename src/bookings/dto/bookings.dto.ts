import {
  IsInt,
  IsDateString,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsEmail,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingSource, PaymentMethod } from '../../generated/prisma/client';

export class CreateBookingDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  vehicleId: number;

  @ApiProperty({ example: '2024-02-01T10:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-02-05T10:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'Need the car for a weekend trip', required: false })
  @IsOptional()
  @IsString()
  renterNotes?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ example: 'Approved for rental', required: false })
  @IsOptional()
  @IsString()
  merchantNotes?: string;
}

export class CreateOfflineBookingDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  vehicleId: number;

  @ApiProperty({ example: '2026-04-10T10:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-04-12T10:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  offlineCustomerName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  offlineCustomerPhone: string;

  @ApiProperty({ example: 'rahul@example.com', required: false })
  @IsOptional()
  @IsEmail()
  offlineCustomerEmail?: string;

  @ApiProperty({ example: 'Walked in on Saturday evening', required: false })
  @IsOptional()
  @IsString()
  offlineCustomerNotes?: string;

  @ApiProperty({
    example: 2500,
    required: false,
    description: 'Override the computed totalPrice (e.g. walk-in discount).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @ApiProperty({ enum: PaymentMethod, required: false })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    example: 2500,
    required: false,
    description: 'Amount collected by the merchant at booking time.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountCollected?: number;

  @ApiProperty({ example: 'Paid via Paytm UPI', required: false })
  @IsOptional()
  @IsString()
  paymentNote?: string;

  @ApiProperty({
    example: false,
    required: false,
    description:
      'Create the booking directly as COMPLETED (for back-dated walk-ins that already finished).',
  })
  @IsOptional()
  @IsBoolean()
  createAsCompleted?: boolean;

  @ApiProperty({ example: 'Customer paid full amount in cash', required: false })
  @IsOptional()
  @IsString()
  merchantNotes?: string;
}

export class UpdateOfflinePaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(0)
  amountCollected: number;

  @ApiProperty({ example: 'Paid via UPI ref #1234', required: false })
  @IsOptional()
  @IsString()
  paymentNote?: string;
}

export class MerchantBookingsQueryDto {
  @ApiProperty({
    enum: BookingSource,
    required: false,
    description: 'Filter bookings by source (ONLINE or OFFLINE). Omit for all.',
  })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource;
}
