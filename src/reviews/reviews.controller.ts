import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/reviews.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../generated/prisma/client';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RENTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review (Renter only)' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Can only review completed bookings',
  })
  async create(@GetUser('id') reviewerId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(reviewerId, dto);
  }

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Get reviews for a merchant' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async findByMerchant(@Param('merchantId', ParseUUIDPipe) merchantId: string) {
    return this.reviewsService.findByMerchant(merchantId);
  }
}
