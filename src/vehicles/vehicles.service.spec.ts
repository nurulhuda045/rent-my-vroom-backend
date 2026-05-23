import { BadRequestException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Role } from '../generated/prisma/client';
import { randomUUID } from 'crypto';

describe('VehiclesService image key mapping', () => {
  it('maps image keys to public urls when creating vehicle', async () => {
    const merchantId = randomUUID();
    const vehicleId = randomUUID();

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: merchantId, role: Role.MERCHANT }),
      },
      vehicle: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: vehicleId }),
      },
    } as any;

    const uploadsService = {
      buildPublicUrls: jest
        .fn()
        .mockReturnValue([`https://cdn.example.com/vehicle-image/${merchantId}/car.jpg`]),
    } as any;

    const service = new VehiclesService(prisma, uploadsService);

    await service.create(merchantId, {
      make: 'Toyota',
      model: 'Yaris',
      year: 2020,
      color: 'Blue',
      licensePlate: 'XYZ-111',
      pricePerHour: 10,
      pricePerDay: 60,
      seats: 5,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      imageKeys: [`vehicle-image/${merchantId}/car.jpg`],
    });

    expect(uploadsService.buildPublicUrls).toHaveBeenCalledWith([`vehicle-image/${merchantId}/car.jpg`]);
    expect(prisma.vehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          images: [`https://cdn.example.com/vehicle-image/${merchantId}/car.jpg`],
        }),
      }),
    );
  });
});

describe('VehiclesService search', () => {
  it('rejects incomplete geo search parameters', async () => {
    const prisma = {
      vehicle: {
        findMany: jest.fn(),
      },
    } as any;

    const uploadsService = {
      buildPublicUrls: jest.fn(),
    } as any;

    const service = new VehiclesService(prisma, uploadsService);

    await expect(
      service.findAll({
        latitude: 12.9716,
        radiusKm: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns radius matches ordered by computed distance', async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();

    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        { id: id2, distanceKm: 4.2 },
        { id: id1, distanceKm: 7.8 },
      ]),
      vehicle: {
        findMany: jest.fn().mockResolvedValue([
          { id: id1, make: 'Toyota' },
          { id: id2, make: 'Honda' },
        ]),
      },
    } as any;

    const uploadsService = {
      buildPublicUrls: jest.fn(),
    } as any;

    const service = new VehiclesService(prisma, uploadsService);

    const result = await service.findAll({
      latitude: 12.9716,
      longitude: 77.5946,
      radiusKm: 10,
      isAvailable: true,
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [id2, id1],
        },
      },
    });
    expect(result).toEqual([
      { id: id2, make: 'Honda', distanceKm: 4.2 },
      { id: id1, make: 'Toyota', distanceKm: 7.8 },
    ]);
  });
});
