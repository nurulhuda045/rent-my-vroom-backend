import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { MessagesService } from "./messages.service";
import { CreateMessageDto } from "./dto/messages.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../common/decorators/get-user.decorator";

@ApiTags("messages")
@Controller("messages")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post(":bookingId")
  @ApiOperation({ summary: "Send a message for a booking" })
  @ApiResponse({ status: 201, description: "Message sent successfully" })
  @ApiResponse({
    status: 403,
    description: "Can only message for your own bookings",
  })
  async create(
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @GetUser("id") senderId: number,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.create(bookingId, senderId, dto);
  }

  @Get(":bookingId")
  @ApiOperation({ summary: "Get messages for a booking" })
  @ApiResponse({ status: 200, description: "Messages retrieved successfully" })
  @ApiResponse({
    status: 403,
    description: "Can only view your own booking messages",
  })
  async findByBooking(
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @GetUser("id") userId: number,
  ) {
    return this.messagesService.findByBooking(bookingId, userId);
  }
}
