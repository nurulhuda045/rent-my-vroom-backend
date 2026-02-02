import { IsInt, IsDateString, IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateBookingDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  vehicleId: number;

  @ApiProperty({ example: "2024-02-01T10:00:00Z" })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: "2024-02-05T10:00:00Z" })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: "Need the car for a weekend trip", required: false })
  @IsOptional()
  @IsString()
  renterNotes?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ example: "Approved for rental", required: false })
  @IsOptional()
  @IsString()
  merchantNotes?: string;
}
