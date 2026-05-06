import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { KYCService } from '../kyc/kyc.service';
import {
  AdminBookingsQueryDto,
  AdminDashboardActivityQueryDto,
  AdminKycDecisionDto,
  AdminKycQueryDto,
  AdminLicensesQueryDto,
  AdminListQueryDto,
  AdminLicenseDecisionDto,
  AdminMessagesQueryDto,
  AdminReviewsQueryDto,
  AdminUsersQueryDto,
  AdminVehiclesQueryDto,
} from './dto/admin.dto';
import {
  BookingSource,
  BookingStatus,
  KYCStatus,
  LicenseStatus,
  Role,
} from '../generated/prisma/client';

type SortOrder = 'asc' | 'desc';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private kycService: KYCService,
  ) {}

  async getDashboardSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalMerchants,
      totalRenters,
      totalVehicles,
      activeBookingsCount,
      completedBookingsCount,
      pendingKycCount,
      pendingLicenseCount,
      monthlyGmv,
      offlineCollected,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.MERCHANT } }),
      this.prisma.user.count({ where: { role: Role.RENTER } }),
      this.prisma.vehicle.count(),
      this.prisma.booking.count({
        where: {
          status: { in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
        },
      }),
      this.prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      this.prisma.kYC.count({ where: { status: KYCStatus.PENDING } }),
      this.prisma.user.count({
        where: {
          role: Role.RENTER,
          licenseStatus: LicenseStatus.PENDING,
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          startDate: { gte: startOfMonth },
          status: { in: [BookingStatus.ACCEPTED, BookingStatus.COMPLETED] },
        },
        _sum: { totalPrice: true },
      }),
      this.prisma.booking.aggregate({
        where: { source: BookingSource.OFFLINE },
        _sum: { amountCollected: true },
      }),
    ]);

    return {
      totalUsers,
      totalMerchants,
      totalRenters,
      totalVehicles,
      activeBookingsCount,
      completedBookingsCount,
      pendingKycCount,
      pendingLicenseCount,
      monthlyGmv: Number(monthlyGmv._sum.totalPrice || 0),
      offlineCollectedAmount: Number(offlineCollected._sum.amountCollected || 0),
    };
  }

  async getDashboardActivity(query: AdminDashboardActivityQueryDto) {
    const limit = query.limit ?? 12;

    const [recentBookings, pendingKyc, pendingLicenses] = await Promise.all([
      this.prisma.booking.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: { select: { id: true, make: true, model: true } },
          merchant: { select: { id: true, businessName: true, firstName: true, lastName: true } },
          renter: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.kYC.findMany({
        where: { status: KYCStatus.PENDING },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { role: Role.RENTER, licenseStatus: LicenseStatus.PENDING },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          licenseStatus: true,
          createdAt: true,
        },
      }),
    ]);

    return [
      ...recentBookings.map((booking) => ({
        id: `booking-${booking.id}`,
        type: 'booking',
        timestamp: booking.createdAt,
        title: `Booking #${booking.id} created`,
        description: `${booking.vehicle.make} ${booking.vehicle.model} • ${booking.status}`,
        entityId: booking.id,
        entityType: 'booking',
      })),
      ...pendingKyc.map((kyc) => ({
        id: `kyc-${kyc.id}`,
        type: 'kyc',
        timestamp: kyc.createdAt,
        title: `KYC pending for ${this.formatName(kyc.user.firstName, kyc.user.lastName)}`,
        description: kyc.user.phone,
        entityId: kyc.id,
        entityType: 'kyc',
      })),
      ...pendingLicenses.map((user) => ({
        id: `license-${user.id}`,
        type: 'license',
        timestamp: user.createdAt,
        title: `License approval pending for ${this.formatName(user.firstName, user.lastName)}`,
        description: user.phone,
        entityId: user.id,
        entityType: 'license',
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getUsers(query: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.licenseStatus ? { licenseStatus: query.licenseStatus } : {}),
      ...(query.registrationStep ? { registrationStep: query.registrationStep } : {}),
      ...(query.kycStatus ? { kyc: { is: { status: query.kycStatus } } } : {}),
      ...(query.search
        ? {
            OR: [
              { phone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { businessName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.paginate(this.prisma.user, query, {
      where,
      include: {
        kyc: {
          select: {
            id: true,
            status: true,
            verifiedAt: true,
            rejectionReason: true,
          },
        },
        _count: {
          select: {
            vehicles: true,
            bookingsAsMerchant: true,
            bookingsAsRenter: true,
          },
        },
      },
    });

    return this.paginatedResponse(items, total, query);
  }

  async getUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        kyc: true,
        vehicles: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        bookingsAsMerchant: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { vehicle: true },
        },
        bookingsAsRenter: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { vehicle: true },
        },
      },
    });
  }

  async getLicenses(query: AdminLicensesQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: Role.RENTER,
      ...(query.status ? { licenseStatus: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { phone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.paginate(this.prisma.user, query, {
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        licenseUrl: true,
        licenseStatus: true,
        licenseApprovedAt: true,
        createdAt: true,
      },
    });

    return this.paginatedResponse(items, total, query);
  }

  async decideLicense(adminId: number, userId: number, dto: AdminLicenseDecisionDto) {
    return this.usersService.approveLicense(adminId, userId, dto);
  }

  async getKyc(query: AdminKycQueryDto) {
    const where: Prisma.KYCWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { licenseNumber: { contains: query.search, mode: 'insensitive' } },
              { user: { is: { firstName: { contains: query.search, mode: 'insensitive' } } } },
              { user: { is: { lastName: { contains: query.search, mode: 'insensitive' } } } },
              { user: { is: { phone: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.paginate(this.prisma.kYC, query, {
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    return this.paginatedResponse(items, total, query);
  }

  async getKycById(id: number) {
    return this.prisma.kYC.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  async approveKyc(id: number) {
    return this.kycService.approveKYC(id);
  }

  async rejectKyc(id: number, dto: AdminKycDecisionDto) {
    return this.kycService.rejectKYC(id, dto.reason);
  }

  async getVehicles(query: AdminVehiclesQueryDto) {
    const where: Prisma.VehicleWhereInput = {
      ...(typeof query.isAvailable === 'boolean' ? { isAvailable: query.isAvailable } : {}),
      ...(query.merchantId ? { merchantId: query.merchantId } : {}),
      ...(query.search
        ? {
            OR: [
              { make: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { licensePlate: { contains: query.search, mode: 'insensitive' } },
              { merchant: { is: { businessName: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.paginate(this.prisma.vehicle, query, {
      where,
      include: {
        merchant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            businessName: true,
            phone: true,
          },
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    return this.paginatedResponse(items, total, query);
  }

  async getVehicleById(id: number) {
    return this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        merchant: true,
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            renter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async getBookings(query: AdminBookingsQueryDto) {
    const where = this.buildBookingsWhere(query);

    const [items, total] = await this.paginate(this.prisma.booking, query, {
      where,
      include: {
        vehicle: true,
        merchant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            businessName: true,
            phone: true,
          },
        },
        renter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    return this.paginatedResponse(items, total, query);
  }

  async getBookingById(id: number) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        vehicle: true,
        merchant: true,
        renter: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        review: true,
      },
    });
  }

  async getReviews(query: AdminReviewsQueryDto) {
    const where: Prisma.ReviewWhereInput = {
      ...(query.merchantId ? { booking: { is: { merchantId: query.merchantId } } } : {}),
      ...(query.search
        ? {
            OR: [
              { comment: { contains: query.search, mode: 'insensitive' } },
              { reviewer: { is: { firstName: { contains: query.search, mode: 'insensitive' } } } },
              { reviewer: { is: { lastName: { contains: query.search, mode: 'insensitive' } } } },
              {
                booking: {
                  is: {
                    vehicle: {
                      is: { make: { contains: query.search, mode: 'insensitive' } },
                    },
                  },
                },
              },
              {
                booking: {
                  is: {
                    vehicle: {
                      is: { model: { contains: query.search, mode: 'insensitive' } },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.paginate(this.prisma.review, query, {
      where,
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        booking: {
          include: {
            vehicle: {
              select: {
                id: true,
                make: true,
                model: true,
                year: true,
              },
            },
            merchant: {
              select: {
                id: true,
                businessName: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return this.paginatedResponse(items, total, query);
  }

  async getMessages(query: AdminMessagesQueryDto) {
    const where: Prisma.MessageWhereInput = {
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
      ...(query.search
        ? {
            OR: [
              { content: { contains: query.search, mode: 'insensitive' } },
              { sender: { is: { firstName: { contains: query.search, mode: 'insensitive' } } } },
              { sender: { is: { lastName: { contains: query.search, mode: 'insensitive' } } } },
              { receiver: { is: { firstName: { contains: query.search, mode: 'insensitive' } } } },
              { receiver: { is: { lastName: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.paginate(this.prisma.message, query, {
      where,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        booking: {
          include: {
            vehicle: {
              select: { id: true, make: true, model: true },
            },
          },
        },
      },
    });

    return this.paginatedResponse(items, total, query);
  }

  async exportUsers(query: AdminUsersQueryDto) {
    const result = await this.getUsers({
      ...query,
      page: 1,
      pageSize: 1000,
    });

    const users = result.items as Array<{
      id: number;
      firstName: string | null;
      lastName: string | null;
      phone: string;
      email: string | null;
      role: Role;
      registrationStep: string | null;
      licenseStatus: LicenseStatus | null;
      createdAt: Date;
      kyc?: { status: KYCStatus } | null;
    }>;

    const rows = users.map((user) => ({
      id: user.id,
      name: this.formatName(user.firstName, user.lastName),
      phone: user.phone,
      email: user.email ?? '',
      role: user.role,
      registrationStep: user.registrationStep ?? '',
      licenseStatus: user.licenseStatus ?? '',
      kycStatus: user.kyc?.status ?? '',
      createdAt: user.createdAt,
    }));

    return this.toCsv(rows);
  }

  async exportBookings(query: AdminBookingsQueryDto) {
    const result = await this.getBookings({
      ...query,
      page: 1,
      pageSize: 1000,
    });

    const bookings = result.items as Array<{
      id: number;
      status: BookingStatus;
      source: BookingSource;
      startDate: Date;
      endDate: Date;
      totalPrice: unknown;
      amountCollected: unknown;
      offlineCustomerName: string | null;
      createdAt: Date;
      vehicle: { make: string; model: string };
      merchant: { businessName: string | null; firstName: string | null; lastName: string | null };
      renter: { firstName: string | null; lastName: string | null } | null;
    }>;

    const rows = bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      source: booking.source,
      vehicle: `${booking.vehicle.make} ${booking.vehicle.model}`,
      merchant:
        booking.merchant.businessName ||
        this.formatName(booking.merchant.firstName, booking.merchant.lastName),
      renter: booking.renter
        ? this.formatName(booking.renter.firstName, booking.renter.lastName)
        : booking.offlineCustomerName || '',
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalPrice: booking.totalPrice,
      amountCollected: booking.amountCollected ?? '',
      createdAt: booking.createdAt,
    }));

    return this.toCsv(rows);
  }

  private buildBookingsWhere(query: AdminBookingsQueryDto): Prisma.BookingWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.merchantId ? { merchantId: query.merchantId } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            startDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { offlineCustomerName: { contains: query.search, mode: 'insensitive' } },
              { offlineCustomerPhone: { contains: query.search, mode: 'insensitive' } },
              { merchant: { is: { businessName: { contains: query.search, mode: 'insensitive' } } } },
              { renter: { is: { firstName: { contains: query.search, mode: 'insensitive' } } } },
              { renter: { is: { lastName: { contains: query.search, mode: 'insensitive' } } } },
              { vehicle: { is: { make: { contains: query.search, mode: 'insensitive' } } } },
              { vehicle: { is: { model: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
  }

  private async paginate(model: any, query: AdminListQueryDto, args: Record<string, unknown>) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = (query.sortOrder ?? 'desc') as SortOrder;
    const orderBy = { [sortBy]: sortOrder };

    const [items, total] = await Promise.all([
      model.findMany({
        ...args,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      model.count({ where: (args as any).where }),
    ]);

    return [items, total] as const;
  }

  private paginatedResponse(items: unknown[], total: number, query: AdminListQueryDto) {
    return {
      items,
      total,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
    };
  }

  private formatName(firstName?: string | null, lastName?: string | null) {
    return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
  }

  private toCsv(rows: Record<string, unknown>[]) {
    if (rows.length === 0) {
      return '';
    }

    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            const cell = value == null ? '' : String(value);
            return `"${cell.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ];

    return lines.join('\n');
  }
}
