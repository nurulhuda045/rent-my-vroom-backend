import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/reviews.dto';
import { BookingStatus } from '../generated/prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(reviewerId: number, dto: CreateReviewDto) {
    // Get booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify reviewer is the renter
    if (booking.renterId !== reviewerId) {
      throw new ForbiddenException('Only the renter can review this booking');
    }

    // Verify booking is completed
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed bookings');
    }

    // Check if review already exists
    if (booking.review) {
      throw new BadRequestException('Booking already has a review');
    }

    const review = await this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        reviewerId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            vehicle: true,
          },
        },
      },
    });

    return review;
  }

  async findByMerchant(merchantId: number) {
    const reviews = await this.prisma.review.findMany({
      where: {
        booking: {
          merchantId,
        },
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
    };
  }
}
