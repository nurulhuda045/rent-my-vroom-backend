import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KYCStatus, RegistrationStep } from '../generated/prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, KYC_FIELDS, KYC_WITH_USER_FIELDS } from '../common';

@Injectable()
export class KYCService {
  private readonly logger = new Logger(KYCService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get KYC status for a user
   */
  async getKYCStatus(userId: number) {
    const kyc = await this.prisma.kYC.findUnique({
      where: { userId },
      select: KYC_FIELDS,
    });

    if (!kyc) {
      throw new HttpException(ERROR_MESSAGES.KYC_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return kyc;
  }

  /**
   * Get all pending KYC requests (Admin only)
   */
  async getPendingKYCRequests() {
    const pendingKYCs = await this.prisma.kYC.findMany({
      where: {
        status: KYCStatus.PENDING,
      },
      select: KYC_WITH_USER_FIELDS,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return pendingKYCs;
  }

  /**
   * Approve KYC (Admin only)
   */
  async approveKYC(kycId: number) {
    const kyc = await this.findKYCById(kycId);
    this.verifyKYCPending(kyc.status);

    // Update KYC status
    const updatedKYC = await this.prisma.kYC.update({
      where: { id: kycId },
      data: {
        status: KYCStatus.APPROVED,
        verifiedAt: new Date(),
      },
    });

    // Update user registration step
    await this.updateUserKYCStatus(kyc.userId, RegistrationStep.KYC_APPROVED, 'APPROVED');

    this.logger.log(`KYC approved for user ${kyc.userId}`);

    return {
      message: SUCCESS_MESSAGES.KYC_APPROVED,
      kyc: updatedKYC,
    };
  }

  /**
   * Reject KYC (Admin only)
   */
  async rejectKYC(kycId: number, reason: string) {
    const kyc = await this.findKYCById(kycId);
    this.verifyKYCPending(kyc.status);

    // Update KYC status
    const updatedKYC = await this.prisma.kYC.update({
      where: { id: kycId },
      data: {
        status: KYCStatus.REJECTED,
        rejectionReason: reason,
      },
    });

    // Update user registration step back to PROFILE_COMPLETED
    await this.updateUserKYCStatus(kyc.userId, RegistrationStep.PROFILE_COMPLETED, 'REJECTED');

    this.logger.log(`KYC rejected for user ${kyc.userId}: ${reason}`);

    return {
      message: SUCCESS_MESSAGES.KYC_REJECTED,
      kyc: updatedKYC,
    };
  }

  // Private helper methods

  /**
   * Find KYC by ID or throw error
   */
  private async findKYCById(kycId: number) {
    const kyc = await this.prisma.kYC.findUnique({
      where: { id: kycId },
      include: { user: true },
    });

    if (!kyc) {
      throw new HttpException(ERROR_MESSAGES.KYC_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return kyc;
  }

  /**
   * Verify KYC is in pending status
   */
  private verifyKYCPending(status: KYCStatus) {
    if (status !== KYCStatus.PENDING) {
      throw new HttpException(ERROR_MESSAGES.KYC_NOT_PENDING, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Update user's KYC status and registration step
   */
  private async updateUserKYCStatus(
    userId: number,
    registrationStep: RegistrationStep,
    licenseStatus: string,
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        registrationStep,
        licenseStatus: licenseStatus as any,
      },
    });
  }
}
