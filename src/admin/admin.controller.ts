import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';
import { AdminService } from './admin.service';
import {
  AdminBookingsQueryDto,
  AdminDashboardActivityQueryDto,
  AdminKycDecisionDto,
  AdminKycQueryDto,
  AdminLicensesQueryDto,
  AdminLicenseDecisionDto,
  AdminMessagesQueryDto,
  AdminReviewsQueryDto,
  AdminUsersQueryDto,
  AdminVehiclesQueryDto,
} from './dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get dashboard KPI summary (Admin only)' })
  getDashboardSummary() {
    return this.adminService.getDashboardSummary();
  }

  @Get('dashboard/activity')
  @ApiOperation({ summary: 'Get recent admin activity feed (Admin only)' })
  getDashboardActivity(@Query() query: AdminDashboardActivityQueryDto) {
    return this.adminService.getDashboardActivity(query);
  }

  @Get('users')
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserById(id);
  }

  @Get('licenses')
  getLicenses(@Query() query: AdminLicensesQueryDto) {
    return this.adminService.getLicenses(query);
  }

  @Patch('licenses/:userId')
  decideLicense(
    @GetUser('id') adminId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AdminLicenseDecisionDto,
  ) {
    return this.adminService.decideLicense(adminId, userId, dto);
  }

  @Get('kyc')
  getKyc(@Query() query: AdminKycQueryDto) {
    return this.adminService.getKyc(query);
  }

  @Get('kyc/:id')
  getKycById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getKycById(id);
  }

  @Patch('kyc/:id/approve')
  approveKyc(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveKyc(id);
  }

  @Patch('kyc/:id/reject')
  rejectKyc(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminKycDecisionDto) {
    return this.adminService.rejectKyc(id, dto);
  }

  @Get('vehicles')
  getVehicles(@Query() query: AdminVehiclesQueryDto) {
    return this.adminService.getVehicles(query);
  }

  @Get('vehicles/:id')
  getVehicle(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getVehicleById(id);
  }

  @Get('bookings')
  getBookings(@Query() query: AdminBookingsQueryDto) {
    return this.adminService.getBookings(query);
  }

  @Get('bookings/:id')
  getBooking(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getBookingById(id);
  }

  @Get('reviews')
  getReviews(@Query() query: AdminReviewsQueryDto) {
    return this.adminService.getReviews(query);
  }

  @Get('messages')
  getMessages(@Query() query: AdminMessagesQueryDto) {
    return this.adminService.getMessages(query);
  }

  @Get('reports/users/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="users.csv"')
  async exportUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.exportUsers(query);
  }

  @Get('reports/bookings/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="bookings.csv"')
  async exportBookings(@Query() query: AdminBookingsQueryDto) {
    return this.adminService.exportBookings(query);
  }
}
