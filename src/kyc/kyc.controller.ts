import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { KYCService } from './kyc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTO for rejection
class RejectKYCDto {
  @ApiProperty({ example: 'License image is not clear' })
  @IsString()
  reason: string;
}

@ApiTags('kyc')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KYCController {
  constructor(private kycService: KYCService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get KYC status for current user' })
  @ApiResponse({ status: 200, description: 'KYC status retrieved' })
  @ApiResponse({ status: 404, description: 'KYC not found' })
  async getStatus(@GetUser('id') userId: number) {
    return this.kycService.getKYCStatus(userId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending KYC requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending KYC requests retrieved' })
  async getPendingRequests() {
    // TODO: Add admin role guard
    return this.kycService.getPendingKYCRequests();
  }

  @Post('approve/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve KYC request (Admin only)' })
  @ApiResponse({ status: 200, description: 'KYC approved successfully' })
  @ApiResponse({ status: 404, description: 'KYC not found' })
  @ApiResponse({ status: 400, description: 'KYC is not pending' })
  async approveKYC(@Param('id', ParseIntPipe) kycId: number) {
    // TODO: Add admin role guard
    return this.kycService.approveKYC(kycId);
  }

  @Post('reject/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject KYC request (Admin only)' })
  @ApiResponse({ status: 200, description: 'KYC rejected' })
  @ApiResponse({ status: 404, description: 'KYC not found' })
  @ApiResponse({ status: 400, description: 'KYC is not pending' })
  async rejectKYC(@Param('id', ParseIntPipe) kycId: number, @Body() dto: RejectKYCDto) {
    // TODO: Add admin role guard
    return this.kycService.rejectKYC(kycId, dto.reason);
  }
}
