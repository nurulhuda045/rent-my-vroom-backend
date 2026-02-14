/* global describe, it, expect, jest */
import { VehiclesService } from './vehicles.service';
import { Role } from '../generated/prisma/client';

describe('VehiclesService image key mapping', () => {
  it('maps image keys to public urls when creating vehicle', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 5, role: Role.MERCHANT }),
      },
      vehicle: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
    } as any;

    const uploadsService = {
      buildPublicUrls: jest.fn().mockReturnValue(['https://cdn.example.com/vehicle-image/5/car.jpg']),
    } as any;

    const service = new VehiclesService(prisma, uploadsService);

    await service.create(5, {
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
      imageKeys: ['vehicle-image/5/car.jpg'],
    });

    expect(uploadsService.buildPublicUrls).toHaveBeenCalledWith(['vehicle-image/5/car.jpg']);
    expect(prisma.vehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          images: ['https://cdn.example.com/vehicle-image/5/car.jpg'],
        }),
      }),
    );
  });
});
