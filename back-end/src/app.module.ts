import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvService } from '@core/config/env.service';
import { LoggerService } from '@core/logger/logger.service';
import { EventPublisher } from '@core/events/event-publisher';
import { AsaasWebhookValidator } from '@asaas/validators/webhook.validator';
import { PaymentContractRepository } from '@blockchain/repositories/payment-contract.repository';

/**
 * AppModule
 *
 * Root NestJS module that configures the entire application.
 * Provides:
 * - Environment configuration with validation
 * - Global logger service
 * - Event publishing infrastructure
 * - Repository patterns for database and blockchain
 *
 * All modules should import this module to access shared services.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    // Configuration
    EnvService,

    // Logging
    LoggerService,

    // Events
    EventPublisher,

    // Validators
    AsaasWebhookValidator,

    // Repositories - Blockchain
    PaymentContractRepository,
  ],
  exports: [
    EnvService,
    LoggerService,
    EventPublisher,
    AsaasWebhookValidator,
    PaymentContractRepository,
  ],
})
export class AppModule {
  constructor(private envService: EnvService, private loggerService: LoggerService) {
    const logger = this.loggerService.createLogger('AppModule');

    logger.info('Application module initialized', {
      environment: this.envService.get('NODE_ENV'),
      port: this.envService.get('PORT'),
    });
  }
}
