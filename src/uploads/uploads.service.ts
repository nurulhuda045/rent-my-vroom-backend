import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetPresignedUrlDto } from "./dto/uploads.dto";

@Injectable()
export class UploadsService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.s3Client = new S3Client({
      region: "auto",
      endpoint: this.config.get("R2_ENDPOINT"),
      credentials: {
        accessKeyId: this.config.get("R2_ACCESS_KEY"),
        secretAccessKey: this.config.get("R2_SECRET_KEY"),
      },
    });

    this.bucketName = this.config.get("R2_BUCKET_NAME");
    this.publicUrl = this.config.get("R2_PUBLIC_URL");
  }

  async getPresignedUrl(userId: number, dto: GetPresignedUrlDto) {
    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = dto.fileName.split(".").pop();
    const key = `${dto.fileType}/${userId}/${timestamp}-${randomString}.${fileExtension}`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Generate public URL
    const publicUrl = this.buildPublicUrl(key);

    return {
      uploadUrl,
      publicUrl,
      key,
    };
  }

  buildPublicUrl(key: string): string {
    const normalizedKey = this.normalizeKey(key);
    return `${this.publicUrl}/${normalizedKey}`;
  }

  buildPublicUrls(keys: string[] = []): string[] {
    return keys.map((key) => this.buildPublicUrl(key));
  }

  private normalizeKey(key: string): string {
    const trimmedKey = key?.trim();
    if (!trimmedKey) {
      throw new BadRequestException('File key is required');
    }

    return trimmedKey.replace(/^\/+/, '');
  }
}
