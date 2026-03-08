import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
  IsInt,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

const transformBooleanQueryValue = ({ value }: { value: unknown }) => {
  if (value === undefined || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true' || normalizedValue === '1') {
      return true;
    }

    if (normalizedValue === 'false' || normalizedValue === '0') {
      return false;
    }
  }

  return value;
};

export const VEHICLE_SEARCH_RADIUS_LIMITS = {
  MIN_KM: 1,
  MAX_KM: 500,
} as const;

export class CreateVehicleDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  make: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(1900)
  year: number;

  @ApiProperty({ example: 'Black' })
  @IsString()
  color: string;

  @ApiProperty({ example: 'ABC-1234' })
  @IsString()
  licensePlate: string;

  @ApiProperty({ example: 10.5 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  pricePerHour: number;

  @ApiProperty({ example: 75.0 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  pricePerDay: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  seats: number;

  @ApiProperty({ example: 'Petrol' })
  @IsString()
  fuelType: string;

  @ApiProperty({ example: 'Automatic' })
  @IsString()
  transmission: string;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @IsInt()
  mileage?: number;

  @ApiProperty({
    example: 'Comfortable sedan perfect for city driving',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ['AC', 'GPS', 'Bluetooth'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ example: ['vehicle-image/12/1706980301-abcd123.jpg'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageKeys?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateVehicleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  pricePerHour?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  pricePerDay?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transmission?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  mileage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageKeys?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class FindVehiclesQueryDto {
  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @Transform(transformBooleanQueryValue)
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({
    required: false,
    example: '2026-03-08T10:00:00.000Z',
    description: 'Filter vehicles available from this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    required: false,
    example: '2026-03-09T10:00:00.000Z',
    description: 'Filter vehicles available until this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    example: 40.7128,
    description: 'Search origin latitude',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    required: false,
    example: -74.006,
    description: 'Search origin longitude',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    required: false,
    example: 25,
    description: 'Search radius in kilometers',
    minimum: VEHICLE_SEARCH_RADIUS_LIMITS.MIN_KM,
    maximum: VEHICLE_SEARCH_RADIUS_LIMITS.MAX_KM,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(VEHICLE_SEARCH_RADIUS_LIMITS.MIN_KM)
  @Max(VEHICLE_SEARCH_RADIUS_LIMITS.MAX_KM)
  radiusKm?: number;
}
