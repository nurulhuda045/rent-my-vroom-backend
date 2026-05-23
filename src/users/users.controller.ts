import { Controller, Post, Patch, Get, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UploadLicenseDto, ApproveLicenseDto, UpdateProfileDto } from './dto/users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('upload-license')
  @ApiOperation({ summary: 'Upload driving license (Renter only)' })
  @ApiResponse({ status: 200, description: 'License uploaded successfully' })
  @ApiResponse({ status: 403, description: 'Only renters can upload licenses' })
  async uploadLicense(@GetUser('id') userId: string, @Body() dto: UploadLicenseDto) {
    return this.usersService.uploadLicense(userId, dto);
  }

  @Patch('approve/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve or reject license (Admin only)' })
  @ApiResponse({ status: 200, description: 'License status updated' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async approveLicense(
    @GetUser('id') adminId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ApproveLicenseDto,
  ) {
    return this.usersService.approveLicense(adminId, userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@GetUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@GetUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('pending-licenses')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get pending license approvals (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending licenses retrieved' })
  async getPendingLicenses() {
    return this.usersService.getPendingLicenses();
  }
}
