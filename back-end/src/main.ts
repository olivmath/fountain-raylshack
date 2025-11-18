import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, INestApplication, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { EnvService } from '@core/config/env.service';
import { LoggerService } from '@core/logger/logger.service';

/**
 * Bootstrap the NestJS application
 *
 * This sets up:
 * - Environment configuration validation
 * - Global error handling
 * - Swagger/OpenAPI documentation
 * - Request validation pipes
 * - Structured logging
 */
async function bootstrap() {
  // Create application
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Get global services
  const envService = app.get(EnvService);
  const loggerService = app.get(LoggerService);
  const logger = loggerService.createLogger('Bootstrap');

  try {
    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    // Setup Swagger/OpenAPI documentation
    setupSwagger(app);

    // Get port from environment
    const port = envService.get('PORT');
    const environment = envService.get('NODE_ENV');

    // Start application
    await app.listen(port);

    logger.info('🚀 Application started successfully', {
      port,
      environment,
      timestamp: new Date().toISOString(),
      endpoints: {
        health: `http://localhost:${port}/health`,
        ready: `http://localhost:${port}/ready`,
        swagger: `http://localhost:${port}/api/docs`,
      },
    });

    // Log environment info
    logger.info('📋 Environment configuration loaded', {
      rpcUrl: envService.getBlockchainConfig().rpcUrl.substring(0, 20) + '...',
      supabaseUrl: envService.getSupabaseConfig().url,
    });
  } catch (error) {
    logger.error(
      '❌ Failed to start application',
      error instanceof Error ? error : new Error(String(error))
    );

    // Graceful shutdown
    await loggerService.flush();
    process.exit(1);
  }

  // Graceful shutdown handler
  process.on('SIGTERM', async () => {
    logger.info('📴 SIGTERM received, shutting down gracefully');
    await loggerService.flush();
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('📴 SIGINT received, shutting down gracefully');
    await loggerService.flush();
    await app.close();
    process.exit(0);
  });
}

/**
 * Setup Swagger/OpenAPI documentation
 */
function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Rayls API')
    .setDescription(
      'Event-driven payment gateway with Asaas PIX integration and blockchain transactions'
    )
    .setVersion('1.0.0')
    .addServer(`http://localhost:${process.env.PORT || 3000}`, 'Development')
    .addServer('https://your-project.supabase.co/functions/v1', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer'
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Payments', 'Payment operations')
    .addTag('Webhooks', 'Webhook receivers')
    .addTag('Blockchain', 'Blockchain operations')
    .addTag('Events', 'Event management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
  });
}

// Run bootstrap
bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
