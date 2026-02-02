import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMessageDto } from "./dto/messages.dto";

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async create(bookingId: number, senderId: number, dto: CreateMessageDto) {
    // Get booking to verify participants
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Verify sender is part of the booking
    if (booking.renterId !== senderId && booking.merchantId !== senderId) {
      throw new ForbiddenException(
        "You can only send messages for your own bookings",
      );
    }

    // Determine receiver
    const receiverId =
      booking.renterId === senderId ? booking.merchantId : booking.renterId;

    const message = await this.prisma.message.create({
      data: {
        bookingId,
        senderId,
        receiverId,
        content: dto.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return message;
  }

  async findByBooking(bookingId: number, userId: number) {
    // Verify user is part of the booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.renterId !== userId && booking.merchantId !== userId) {
      throw new ForbiddenException(
        "You can only view messages for your own bookings",
      );
    }

    const messages = await this.prisma.message.findMany({
      where: { bookingId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages as read for the current user
    await this.prisma.message.updateMany({
      where: {
        bookingId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return messages;
  }
}
