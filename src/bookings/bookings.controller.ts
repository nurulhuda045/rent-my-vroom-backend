import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import {
  CreateBookingDto,
  CreateOfflineBookingDto,
  MerchantBookingsQueryDto,
  UpdateBookingStatusDto,
  UpdateOfflinePaymentDto,
} from './dto/bookings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.RENTER)
  @ApiOperation({ summary: 'Create a new booking (Renter only)' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 403, description: 'License must be approved' })
  async create(@GetUser('id') renterId: number, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(renterId, dto);
  }

  @Post('offline')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({
    summary:
      'Create an offline/walk-in booking (Merchant only). Shares inventory with online bookings.',
  })
  @ApiResponse({ status: 201, description: 'Offline booking created successfully' })
  @ApiResponse({ status: 400, description: 'Overlap, invalid dates, or vehicle unavailable' })
  @ApiResponse({ status: 403, description: 'Merchant does not own this vehicle' })
  async createOffline(
    @GetUser('id') merchantId: number,
    @Body() dto: CreateOfflineBookingDto,
  ) {
    return this.bookingsService.createOffline(merchantId, dto);
  }

  @Get('renter')
  @UseGuards(RolesGuard)
  @Roles(Role.RENTER)
  @ApiOperation({ summary: 'Get my bookings as renter' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getRenterBookings(@GetUser('id') renterId: number) {
    return this.bookingsService.findRenterBookings(renterId);
  }

  @Get('merchant')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Get my bookings as merchant (optionally filtered by source)' })
  @ApiQuery({ name: 'source', enum: ['ONLINE', 'OFFLINE'], required: false })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getMerchantBookings(
    @GetUser('id') merchantId: number,
    @Query() query: MerchantBookingsQueryDto,
  ) {
    return this.bookingsService.findMerchantBookings(merchantId, query.source);
  }

  @Patch(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Accept a booking (Merchant only)' })
  @ApiResponse({ status: 200, description: 'Booking accepted' })
  @ApiResponse({
    status: 403,
    description: 'Can only manage your own bookings',
  })
  async acceptBooking(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') merchantId: number,
    @Body() dto?: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.acceptBooking(id, merchantId, dto);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Reject a booking (Merchant only)' })
  @ApiResponse({ status: 200, description: 'Booking rejected' })
  @ApiResponse({
    status: 403,
    description: 'Can only manage your own bookings',
  })
  async rejectBooking(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') merchantId: number,
    @Body() dto?: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.rejectBooking(id, merchantId, dto);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({
    summary: 'Mark booking as completed (Merchant only). Works for online and offline bookings.',
  })
  @ApiResponse({ status: 200, description: 'Booking completed' })
  @ApiResponse({
    status: 403,
    description: 'Can only manage your own bookings',
  })
  async completeBooking(@Param('id', ParseIntPipe) id: number, @GetUser('id') merchantId: number) {
    return this.bookingsService.completeBooking(id, merchantId);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.RENTER)
  @ApiOperation({ summary: 'Cancel a booking (Renter only)' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 400, description: 'Cancellation window expired or invalid status' })
  @ApiResponse({ status: 403, description: 'Can only cancel your own bookings' })
  async cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') renterId: number,
  ) {
    return this.bookingsService.cancelBooking(id, renterId);
  }

  @Patch(':id/offline/payment')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({
    summary: 'Update collected payment details on an offline booking (Merchant only)',
  })
  @ApiResponse({ status: 200, description: 'Payment details updated' })
  @ApiResponse({ status: 400, description: 'Booking is not offline' })
  @ApiResponse({ status: 403, description: 'Can only manage your own bookings' })
  async updateOfflinePayment(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') merchantId: number,
    @Body() dto: UpdateOfflinePaymentDto,
  ) {
    return this.bookingsService.updateOfflinePayment(id, merchantId, dto);
  }

  @Patch(':id/offline/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Cancel an offline booking (Merchant only)' })
  @ApiResponse({ status: 200, description: 'Offline booking cancelled' })
  @ApiResponse({ status: 400, description: 'Booking not offline or not in an ACCEPTED state' })
  @ApiResponse({ status: 403, description: 'Can only manage your own bookings' })
  async cancelOfflineBooking(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') merchantId: number,
  ) {
    return this.bookingsService.cancelOfflineBooking(id, merchantId);
  }

  @Get('merchant/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Get merchant earnings and booking statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getMerchantStats(@GetUser('id') merchantId: number) {
    return this.bookingsService.getMerchantStats(merchantId);
  }
}
