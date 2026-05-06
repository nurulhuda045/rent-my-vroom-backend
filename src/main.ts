import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter, AllExceptionsFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: in production, restrict to FRONTEND_URLS; otherwise allow all origins.
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  app.enableCors({
    origin: isProd ? allowedOrigins : true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filters (order matters: Prisma-specific first, catch-all last)
  app.useGlobalFilters(new PrismaExceptionFilter(), new AllExceptionsFilter());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RentMyVroom API')
    .setDescription('Vehicle Rental Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('vehicles', 'Vehicle management endpoints')
    .addTag('bookings', 'Booking management endpoints')
    .addTag('messages', 'Messaging endpoints')
    .addTag('reviews', 'Review endpoints')
    .addTag('uploads', 'File upload endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api`);
}

bootstrap();
