import { IsString, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum FileType {
  VEHICLE_IMAGE = "vehicle-image",
  LICENSE = "license",
}

export class GetPresignedUrlDto {
  @ApiProperty({ example: "image.jpg" })
  @IsString()
  fileName: string;

  @ApiProperty({ example: "image/jpeg" })
  @IsString()
  contentType: string;

  @ApiProperty({ enum: FileType, example: FileType.VEHICLE_IMAGE })
  @IsEnum(FileType)
  fileType: FileType;
}
