import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  BookingSource,
  BookingStatus,
  KYCStatus,
  LicenseStatus,
  RegistrationStep,
  Role,
} from '../../generated/prisma/client';

export class AdminListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'asc' ? 'asc' : 'desc'))
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class AdminUsersQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(LicenseStatus)
  licenseStatus?: LicenseStatus;

  @IsOptional()
  @IsEnum(KYCStatus)
  kycStatus?: KYCStatus;

  @IsOptional()
  @IsEnum(RegistrationStep)
  registrationStep?: RegistrationStep;
}

export class AdminBookingsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vehicleId?: number;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class AdminVehiclesQueryDto extends AdminListQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : undefined))
  isAvailable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;
}

export class AdminKycQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(KYCStatus)
  status?: KYCStatus;
}

export class AdminLicensesQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(LicenseStatus)
  status?: LicenseStatus;
}

export class AdminReviewsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;
}

export class AdminMessagesQueryDto extends AdminListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bookingId?: number;
}

export class AdminLicenseDecisionDto {
  @IsEnum(LicenseStatus)
  @IsIn([LicenseStatus.APPROVED, LicenseStatus.REJECTED])
  status: LicenseStatus;
}

export class AdminKycDecisionDto {
  @IsString()
  reason: string;
}

export class AdminDashboardActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}

