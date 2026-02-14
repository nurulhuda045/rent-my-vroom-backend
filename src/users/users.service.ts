import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadLicenseDto, ApproveLicenseDto, UpdateProfileDto } from './dto/users.dto';
import { LicenseStatus, Role } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadsService } from '../uploads/uploads.service';
import { ERROR_MESSAGES, USER_PROFILE_FIELDS, RENTER_FIELDS } from '../common';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private uploadsService: UploadsService,
  ) {}

  async uploadLicense(userId: number, dto: UploadLicenseDto) {
    const user = await this.findUserById(userId);

    if (user.role !== Role.RENTER) {
      throw new ForbiddenException(ERROR_MESSAGES.LICENSE_ONLY_RENTERS);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        licenseUrl: this.uploadsService.buildPublicUrl(dto.licenseKey),
        licenseStatus: LicenseStatus.PENDING,
      },
      select: RENTER_FIELDS,
    });

    return updatedUser;
  }

  async approveLicense(adminId: number, userId: number, dto: ApproveLicenseDto) {
    await this.verifyAdmin(adminId);
    const user = await this.findUserById(userId);

    if (user.role !== Role.RENTER) {
      throw new BadRequestException(ERROR_MESSAGES.LICENSE_APPROVAL_RENTER_ONLY);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        licenseStatus: dto.status,
        licenseApprovedAt: dto.status === LicenseStatus.APPROVED ? new Date() : null,
      },
      select: RENTER_FIELDS,
    });

    // Send notification email
    if (dto.status === LicenseStatus.APPROVED) {
      await this.notificationsService.sendLicenseApprovalEmail(user.email, user.firstName);
    }

    return updatedUser;
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_FIELDS,
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: USER_PROFILE_FIELDS,
    });

    return user;
  }

  async getPendingLicenses() {
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.RENTER,
        licenseStatus: LicenseStatus.PENDING,
      },
      select: RENTER_FIELDS,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  // Private helper methods

  /**
   * Find user by ID or throw error
   */
  private async findUserById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * Verify user is admin
   */
  private async verifyAdmin(adminId: number) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.LICENSE_APPROVAL_ADMIN_ONLY);
    }

    return admin;
  }
}
