import { IsString, IsEnum, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LicenseStatus } from '../../generated/prisma/client';

export class UploadLicenseDto {
  @ApiProperty({ example: 'license/12/1706980301-abcd123.jpg' })
  @IsString()
  licenseKey: string;
}

export class ApproveLicenseDto {
  @ApiProperty({
    enum: [LicenseStatus.APPROVED, LicenseStatus.REJECTED],
    example: LicenseStatus.APPROVED,
  })
  @IsEnum(LicenseStatus)
  @IsIn([LicenseStatus.APPROVED, LicenseStatus.REJECTED])
  status: LicenseStatus;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;
}
