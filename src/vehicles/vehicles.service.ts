import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, FindVehiclesQueryDto, UpdateVehicleDto } from './dto/vehicles.dto';
import { Prisma, Role } from '../generated/prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, MERCHANT_FIELDS, GeoUtils } from '../common';
import { UploadsService } from '../uploads/uploads.service';

type VehicleSearchCriteria = {
  isAvailable?: boolean;
  startDate?: Date;
  endDate?: Date;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

type VehicleDistanceRow = {
  id: number;
  distanceKm: number;
};

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

  async findAll(query: FindVehiclesQueryDto = {}) {
    const criteria = this.normalizeSearchCriteria(query);

    if (this.hasGeoSearch(criteria)) {
      return this.findAllWithinRadius(criteria);
    }

    return this.prisma.vehicle.findMany({
      where: this.buildVehicleWhereInput(criteria),
      orderBy: {
        createdAt: 'desc',
      },
    });
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

  private normalizeSearchCriteria(query: FindVehiclesQueryDto): VehicleSearchCriteria {
    this.validateGeoSearch(query);

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.startDate
      ? query.endDate
        ? new Date(query.endDate)
        : this.getDefaultSearchEndDate(query.startDate)
      : undefined;

    if (startDate && endDate && endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    return {
      isAvailable: query.isAvailable,
      startDate,
      endDate,
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: query.radiusKm,
    };
  }

  private async findAllWithinRadius(criteria: VehicleSearchCriteria) {
    const matches = await this.findVehicleIdsWithinRadius(criteria);

    if (matches.length === 0) {
      return [];
    }

    const distanceByVehicleId = new Map(
      matches.map((match, index) => [match.id, { distanceKm: Number(match.distanceKm), index }]),
    );

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        id: {
          in: matches.map((match) => match.id),
        },
      },
    });

    return vehicles
      .sort(
        (left, right) =>
          (distanceByVehicleId.get(left.id)?.index ?? 0) -
          (distanceByVehicleId.get(right.id)?.index ?? 0),
      )
      .map((vehicle) => ({
        ...vehicle,
        distanceKm: distanceByVehicleId.get(vehicle.id)?.distanceKm ?? null,
      }));
  }

  private async findVehicleIdsWithinRadius(criteria: VehicleSearchCriteria) {
    const { latitude, longitude, radiusKm } = criteria;

    if (latitude === undefined || longitude === undefined || radiusKm === undefined) {
      throw new BadRequestException('latitude, longitude, and radiusKm are required');
    }

    const bounds = GeoUtils.getBoundingBox(latitude, longitude, radiusKm);
    const distanceSql = this.buildDistanceSql(latitude, longitude);
    const isAvailableSql =
      criteria.isAvailable === undefined
        ? Prisma.empty
        : Prisma.sql`AND v."isAvailable" = ${criteria.isAvailable}`;
    const bookingsSql =
      criteria.startDate && criteria.endDate
        ? Prisma.sql`
            AND NOT EXISTS (
              SELECT 1
              FROM "Booking" b
              WHERE b."vehicleId" = v.id
                AND b."status" IN ('PENDING', 'ACCEPTED')
                AND b."startDate" < ${criteria.endDate}
                AND b."endDate" > ${criteria.startDate}
            )
          `
        : Prisma.empty;

    return this.prisma.$queryRaw<VehicleDistanceRow[]>(Prisma.sql`
      WITH candidate_vehicles AS (
        SELECT
          v.id,
          v."createdAt",
          ${distanceSql} AS "distanceKm"
        FROM "Vehicle" v
        INNER JOIN "User" m ON m.id = v."merchantId"
        WHERE m."latitude" IS NOT NULL
          AND m."longitude" IS NOT NULL
          AND CAST(m."latitude" AS double precision) BETWEEN ${bounds.minLatitude} AND ${bounds.maxLatitude}
          AND ${this.buildLongitudeBoundsSql(bounds)}
          ${isAvailableSql}
          ${bookingsSql}
      )
      SELECT id, "distanceKm"
      FROM candidate_vehicles
      WHERE "distanceKm" <= ${radiusKm}
      ORDER BY "distanceKm" ASC, "createdAt" DESC
    `);
  }

  private buildVehicleWhereInput(criteria: VehicleSearchCriteria): Prisma.VehicleWhereInput {
    return {
      ...(criteria.isAvailable !== undefined ? { isAvailable: criteria.isAvailable } : {}),
      ...this.buildAvailabilityWindowWhere(criteria),
    };
  }

  private buildAvailabilityWindowWhere(
    criteria: Pick<VehicleSearchCriteria, 'startDate' | 'endDate'>,
  ): Prisma.VehicleWhereInput {
    if (!criteria.startDate || !criteria.endDate) {
      return {};
    }

    return {
      bookings: {
        none: {
          status: { in: ['PENDING', 'ACCEPTED'] },
          startDate: { lt: criteria.endDate },
          endDate: { gt: criteria.startDate },
        },
      },
    };
  }

  private buildDistanceSql(latitude: number, longitude: number) {
    return Prisma.sql`
      6371 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS((${latitude} - CAST(m."latitude" AS double precision)) / 2)), 2) +
          COS(RADIANS(${latitude})) *
          COS(RADIANS(CAST(m."latitude" AS double precision))) *
          POWER(SIN(RADIANS((${longitude} - CAST(m."longitude" AS double precision)) / 2)), 2)
        )
      )
    `;
  }

  private buildLongitudeBoundsSql(bounds: ReturnType<typeof GeoUtils.getBoundingBox>) {
    if (!bounds.crossesAntimeridian) {
      return Prisma.sql`
        CAST(m."longitude" AS double precision) BETWEEN ${bounds.minLongitude} AND ${bounds.maxLongitude}
      `;
    }

    return Prisma.sql`
      (
        CAST(m."longitude" AS double precision) >= ${bounds.minLongitude}
        OR CAST(m."longitude" AS double precision) <= ${bounds.maxLongitude}
      )
    `;
  }

  private getDefaultSearchEndDate(startDate: string) {
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    return endDate;
  }

  private hasGeoSearch(criteria: VehicleSearchCriteria) {
    return (
      criteria.latitude !== undefined &&
      criteria.longitude !== undefined &&
      criteria.radiusKm !== undefined
    );
  }

  private validateGeoSearch(query: FindVehiclesQueryDto) {
    const geoFields = [query.latitude, query.longitude, query.radiusKm];
    const providedFieldCount = geoFields.filter((value) => value !== undefined).length;

    if (providedFieldCount > 0 && providedFieldCount < geoFields.length) {
      throw new BadRequestException('latitude, longitude, and radiusKm must be provided together');
    }
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
