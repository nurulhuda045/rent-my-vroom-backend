import { Controller, Get, Post, Patch, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingStatusDto } from './dto/bookings.dto';
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
  @ApiOperation({ summary: 'Get my bookings as merchant' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getMerchantBookings(@GetUser('id') merchantId: number) {
    return this.bookingsService.findMerchantBookings(merchantId);
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
  @ApiOperation({ summary: 'Mark booking as completed (Merchant only)' })
  @ApiResponse({ status: 200, description: 'Booking completed' })
  @ApiResponse({
    status: 403,
    description: 'Can only manage your own bookings',
  })
  async completeBooking(@Param('id', ParseIntPipe) id: number, @GetUser('id') merchantId: number) {
    return this.bookingsService.completeBooking(id, merchantId);
  }
}
