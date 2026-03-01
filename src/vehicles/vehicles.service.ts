import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicles.dto';
import { Role } from '../generated/prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, MERCHANT_FIELDS } from '../common';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  async create(merchantId: number, dto: CreateVehicleDto) {
    // Verify user is a merchant
    await this.verifyMerchant(merchantId);

    // Check if license plate already exists
    await this.checkLicensePlateUnique(dto.licensePlate);

    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...this.mapCreateVehicleAssetKeys(dto),
        merchantId,
      },
      include: {
        merchant: {
          select: MERCHANT_FIELDS,
        },
      },
    });

    return vehicle;
  }

  async findAll(
    filters?: { isAvailable?: boolean },
    dateRange?: { startDate: string; endDate?: string },
  ) {
    const startDate = dateRange ? new Date(dateRange.startDate) : undefined;
    // When only startDate is provided, treat as "available on that day" (use end of same day)
    const endDate = dateRange
      ? dateRange.endDate
        ? new Date(dateRange.endDate)
        : (() => {
            const end = new Date(dateRange.startDate);
            end.setUTCDate(end.getUTCDate() + 1);
            return end;
          })()
      : undefined;

    if (startDate && endDate && endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        ...filters,
        ...(startDate && endDate
          ? {
              bookings: {
                none: {
                  status: { in: ['PENDING', 'ACCEPTED'] },
                  startDate: { lt: endDate },
                  endDate: { gt: startDate },
                },
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return vehicles;
  }

  async findMyVehicles(merchantId: number) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { merchantId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return vehicles;
  }

  async findOne(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        merchant: {
          select: MERCHANT_FIELDS,
        },
        bookings: {
          where: {
            status: {
              in: ['ACCEPTED', 'PENDING'],
            },
          },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(ERROR_MESSAGES.VEHICLE_NOT_FOUND);
    }

    return vehicle;
  }

  async update(id: number, merchantId: number, dto: UpdateVehicleDto) {
    const vehicle = await this.findVehicleById(id);
    this.verifyOwnership(vehicle.merchantId, merchantId);

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: this.mapUpdateVehicleAssetKeys(dto),
    });

    return updated;
  }

  async remove(id: number, merchantId: number) {
    const vehicle = await this.findVehicleById(id);
    this.verifyOwnership(vehicle.merchantId, merchantId);

    await this.prisma.vehicle.delete({
      where: { id },
    });

    return { message: SUCCESS_MESSAGES.VEHICLE_DELETED };
  }

  // Private helper methods

  /**
   * Verify user is a merchant
   */
  private async verifyMerchant(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (user.role !== Role.MERCHANT) {
      throw new ForbiddenException(ERROR_MESSAGES.MERCHANT_ONLY);
    }

    return user;
  }

  /**
   * Check if license plate is unique
   */
  private async checkLicensePlateUnique(licensePlate: string) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { licensePlate },
    });

    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.VEHICLE_LICENSE_EXISTS);
    }
  }

  /**
   * Find vehicle by ID or throw error
   */
  private async findVehicleById(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException(ERROR_MESSAGES.VEHICLE_NOT_FOUND);
    }

    return vehicle;
  }

  private mapCreateVehicleAssetKeys(dto: CreateVehicleDto) {
    const { imageKeys, ...rest } = dto;

    return {
      ...rest,
      images: imageKeys ? this.uploadsService.buildPublicUrls(imageKeys) : undefined,
    };
  }

  private mapUpdateVehicleAssetKeys(dto: UpdateVehicleDto) {
    const { imageKeys, ...rest } = dto;

    if (!imageKeys) {
      return rest;
    }

    return {
      ...rest,
      images: this.uploadsService.buildPublicUrls(imageKeys),
    };
  }
  /**
   * Verify vehicle ownership
   */
  private verifyOwnership(vehicleMerchantId: number, requestMerchantId: number) {
    if (vehicleMerchantId !== requestMerchantId) {
      throw new ForbiddenException(ERROR_MESSAGES.VEHICLE_UNAUTHORIZED);
    }
  }
}
