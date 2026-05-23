import { IsInt, IsString, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', format: 'uuid' })
  @IsUUID('4')
  bookingId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'Great experience! The car was clean and well-maintained.',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
