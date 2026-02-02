import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
  IsInt,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateVehicleDto {
  @ApiProperty({ example: "Toyota" })
  @IsString()
  make: string;

  @ApiProperty({ example: "Camry" })
  @IsString()
  model: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(1900)
  year: number;

  @ApiProperty({ example: "Black" })
  @IsString()
  color: string;

  @ApiProperty({ example: "ABC-1234" })
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

  @ApiProperty({ example: "Petrol" })
  @IsString()
  fuelType: string;

  @ApiProperty({ example: "Automatic" })
  @IsString()
  transmission: string;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @IsInt()
  mileage?: number;

  @ApiProperty({
    example: "Comfortable sedan perfect for city driving",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ["AC", "GPS", "Bluetooth"], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ example: ["https://example.com/image1.jpg"], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

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
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
