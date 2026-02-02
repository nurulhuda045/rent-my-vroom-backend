import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateMessageDto {
  @ApiProperty({ example: "When can I pick up the vehicle?" })
  @IsString()
  content: string;
}
