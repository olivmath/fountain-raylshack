import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { EnvService } from '@core/config/env.service';
import { InvalidWebhookSignatureException, ValidationException } from '@core/errors/app.exceptions';
import { LoggerService } from '@core/logger/logger.service';

/**
 * Asaas Webhook Event Types
 */
export enum AsaasWebhookEvent {
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_CONFIRMED = 'payment.confirmed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_OVERDUE = 'payment.overdue',
}

/**
 * Asaas Webhook Payload Structure
 */
export interface AsaasWebhookPayload {
  id: string;
  event: AsaasWebhookEvent;
  createdAt: string;
  data: {
    id: string;
    object: string;
    account: string;
    customer: string;
    subscription?: string;
    paymentLink?: string;
    installment?: string;
    value: number;
    netValue?: number;
    originalValue?: number;
    interestValue?: number;
    description: string;
    billingType: string;
    confirmedDate?: string;
    pixAddressKey?: string;
    status: string;
    dueDate: string;
    originalDueDate?: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    invoiceUrl?: string;
    invoiceNumber?: string;
    externalReference?: string;
    deleted?: boolean;
    anticipated?: boolean;
    anticipable?: boolean;
    creditDate?: string;
    estimatedCreditDate?: string;
    transactionReceiptUrl?: string;
    nossoNumero?: string;
    bankSlipUrl?: string;
    lastBankSlipRequestDate?: string;
    lastInvoiceRequestDate?: string;
    remoteIp?: string;
    info?: string;
    observations?: string;
    custody?: string;
    sourceNotification?: string;
    chargeback?: {
      status: string;
      reason: string;
      requesterDocument: string;
      amount: number;
      date: string;
    };
    refunds?: Array<{
      refundDate: string;
      value: number;
      status: string;
    }>;
  };
}

/**
 * AsaasWebhookValidator
 *
 * Validates Asaas webhook signatures and payloads.
 * Ensures data integrity and authenticity.
 *
 * @example
 * const isValid = this.validator.validateSignature(
 *   JSON.stringify(payload),
 *   signature
 * );
 */
@Injectable()
export class AsaasWebhookValidator {
  private logger;

  constructor(
    private envService: EnvService,
    private loggerService: LoggerService
  ) {
    this.logger = this.loggerService.createLogger('AsaasWebhookValidator');
  }

  /**
   * Validate webhook signature
   *
   * Asaas uses HMAC-SHA1 signature with the webhook secret.
   * Signature is in the format: sha1=<hex_digest>
   */
  validateSignature(body: string | Buffer, signature: string): boolean {
    try {
      const secret = this.envService.getAsaasConfig().webhookSecret;

      // Convert body to string if Buffer
      const bodyStr = typeof body === 'string' ? body : body.toString();

      // Extract signature hash (remove "sha1=" prefix if present)
      const signatureHash = signature.replace(/^sha1=/, '');

      // Compute expected signature
      const hmac = createHmac('sha1', secret);
      hmac.update(bodyStr);
      const expectedHash = hmac.digest('hex');

      const isValid = signatureHash === expectedHash;

      if (!isValid) {
        this.logger.warn('Invalid webhook signature', {
          expectedHash: expectedHash.substring(0, 8) + '...',
          providedHash: signatureHash.substring(0, 8) + '...',
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error validating webhook signature', error);
      return false;
    }
  }

  /**
   * Validate webhook payload structure
   */
  validatePayload(payload: unknown): payload is AsaasWebhookPayload {
    try {
      // Check required fields
      if (!payload || typeof payload !== 'object') {
        throw new ValidationException('Webhook payload must be an object');
      }

      const p = payload as Record<string, unknown>;

      if (!p.id || typeof p.id !== 'string') {
        throw new ValidationException('Missing or invalid webhook id');
      }

      if (!p.event || typeof p.event !== 'string') {
        throw new ValidationException('Missing or invalid event type');
      }

      if (!p.data || typeof p.data !== 'object') {
        throw new ValidationException('Missing webhook data object');
      }

      const data = p.data as Record<string, unknown>;

      if (!data.id || typeof data.id !== 'string') {
        throw new ValidationException('Missing payment id in webhook data');
      }

      if (typeof data.value !== 'number' || data.value <= 0) {
        throw new ValidationException('Invalid payment value');
      }

      if (!data.description || typeof data.description !== 'string') {
        throw new ValidationException('Missing payment description');
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }
      this.logger.error('Error validating webhook payload', error);
      throw new ValidationException('Invalid webhook payload structure');
    }
  }

  /**
   * Validate and parse webhook
   */
  validateAndParse(body: string | Buffer, signature: string): AsaasWebhookPayload {
    // Validate signature
    if (!this.validateSignature(body, signature)) {
      this.logger.warn('Webhook signature validation failed');
      throw new InvalidWebhookSignatureException();
    }

    // Parse JSON
    let payload: unknown;
    try {
      const bodyStr = typeof body === 'string' ? body : body.toString();
      payload = JSON.parse(bodyStr);
    } catch (error) {
      this.logger.error('Failed to parse webhook body', error);
      throw new ValidationException('Invalid JSON in webhook body');
    }

    // Validate payload structure
    this.validatePayload(payload);

    return payload as AsaasWebhookPayload;
  }

  /**
   * Check if webhook event is supported
   */
  isSupportedEvent(event: string): boolean {
    return Object.values(AsaasWebhookEvent).includes(event as AsaasWebhookEvent);
  }

  /**
   * Get event type enum from string
   */
  getEventType(event: string): AsaasWebhookEvent | null {
    if (this.isSupportedEvent(event)) {
      return event as AsaasWebhookEvent;
    }
    return null;
  }
}
