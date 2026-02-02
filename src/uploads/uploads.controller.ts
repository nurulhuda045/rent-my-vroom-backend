import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UploadsService } from "./uploads.service";
import { GetPresignedUrlDto } from "./dto/uploads.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../common/decorators/get-user.decorator";

@ApiTags("uploads")
@Controller("uploads")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post("presign")
  @ApiOperation({ summary: "Get presigned URL for file upload" })
  @ApiResponse({
    status: 200,
    description: "Presigned URL generated successfully",
  })
  async getPresignedUrl(
    @GetUser("id") userId: number,
    @Body() dto: GetPresignedUrlDto,
  ) {
    return this.uploadsService.getPresignedUrl(userId, dto);
  }
}
