/* global describe, it, expect */
import { BadRequestException } from '@nestjs/common';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  const makeService = () => {
    const config = {
      get: (key: string) => {
        const map: Record<string, string> = {
          R2_ENDPOINT: 'https://test-account.r2.cloudflarestorage.com',
          R2_ACCESS_KEY: 'key',
          R2_SECRET_KEY: 'secret',
          R2_BUCKET_NAME: 'bucket',
          R2_PUBLIC_URL: 'https://cdn.example.com',
        };

        return map[key];
      },
    } as any;

    return new UploadsService(config);
  };

  it('builds a normalized public url from key', () => {
    const service = makeService();

    expect(service.buildPublicUrl('/vehicle-image/1/file.jpg')).toBe(
      'https://cdn.example.com/vehicle-image/1/file.jpg',
    );
  });

  it('builds a list of public urls from keys', () => {
    const service = makeService();

    expect(service.buildPublicUrls(['license/2/doc.jpg', '/vehicle-image/2/one.png'])).toEqual([
      'https://cdn.example.com/license/2/doc.jpg',
      'https://cdn.example.com/vehicle-image/2/one.png',
    ]);
  });

  it('throws when key is empty', () => {
    const service = makeService();

    expect(() => service.buildPublicUrl('   ')).toThrow(BadRequestException);
  });
});
