import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSystemConfigDto {
  @ApiProperty({ example: '4', description: 'Configuration value' })
  @IsString()
  @IsNotEmpty()
  value: string;
}
