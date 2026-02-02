import { IsInt, IsString, IsOptional, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateReviewDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  bookingId: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: "Great experience! The car was clean and well-maintained.",
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
