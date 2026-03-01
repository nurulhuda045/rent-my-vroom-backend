import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BOOKING_CONFIG } from '../common';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  async get(key: string): Promise<string | null> {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    return config?.value ?? null;
  }

  async getAll() {
    return this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async set(key: string, value: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getCancellationWindowHours(): Promise<number> {
    const value = await this.get(BOOKING_CONFIG.CANCELLATION_WINDOW_KEY);
    const parsed = value ? Number(value) : NaN;
    return isNaN(parsed) ? BOOKING_CONFIG.DEFAULT_CANCELLATION_WINDOW_HOURS : parsed;
  }
}
