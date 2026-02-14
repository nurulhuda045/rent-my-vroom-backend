import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetPresignedUrlDto } from './dto/uploads.dto';

@Injectable()
export class UploadsService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.config.get<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.get<string>('R2_ACCESS_KEY'),
        secretAccessKey: this.config.get<string>('R2_SECRET_KEY'),
      },
    });

    this.bucketName = this.config.get<string>('R2_BUCKET_NAME') || '';
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL') || '';

    if (!this.bucketName || !this.publicUrl) {
      throw new InternalServerErrorException('R2 configuration is incomplete');
    }
  }

  async getPresignedUrl(userId: number, dto: GetPresignedUrlDto) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = dto.fileName.split('.').pop();
    const key = `${dto.fileType}/${userId}/${timestamp}-${randomString}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

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

    if (/^https?:\/\//i.test(trimmedKey)) {
      throw new BadRequestException('Expected a storage key, received a full URL');
    }

    return trimmedKey.replace(/^\/+/, '');
  }
}
