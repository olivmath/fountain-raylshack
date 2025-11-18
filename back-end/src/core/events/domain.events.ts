/**
 * Domain Events
 *
 * Core events that drive the system.
 * Events are immutable and represent something that happened.
 */

export abstract class DomainEvent {
  readonly id: string = crypto.randomUUID();
  readonly aggregateId: string;
  readonly timestamp: Date = new Date();
  readonly version: number = 1;

  constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
  }

  abstract getEventType(): string;
  abstract getEventName(): string;
}

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

/**
 * Fired when a PIX payment is received from Asaas
 */
export class PaymentReceivedEvent extends DomainEvent {
  constructor(
    readonly paymentId: string,
    readonly amount: number,
    readonly payer: string,
    readonly description: string,
    readonly pixKey: string,
    readonly metadata: Record<string, unknown>
  ) {
    super(paymentId);
  }

  getEventType(): string {
    return 'payment.received';
  }

  getEventName(): string {
    return 'Payment Received';
  }
}

/**
 * Fired when a payment is confirmed
 */
export class PaymentConfirmedEvent extends DomainEvent {
  constructor(
    readonly paymentId: string,
    readonly confirmedAt: Date,
    readonly transactionId: string
  ) {
    super(paymentId);
  }

  getEventType(): string {
    return 'payment.confirmed';
  }

  getEventName(): string {
    return 'Payment Confirmed';
  }
}

/**
 * Fired when a payment fails
 */
export class PaymentFailedEvent extends DomainEvent {
  constructor(
    readonly paymentId: string,
    readonly reason: string,
    readonly error?: string
  ) {
    super(paymentId);
  }

  getEventType(): string {
    return 'payment.failed';
  }

  getEventName(): string {
    return 'Payment Failed';
  }
}

// ============================================================================
// BLOCKCHAIN EVENTS
// ============================================================================

/**
 * Fired when a blockchain transaction is initiated
 */
export class BlockchainTransactionInitiatedEvent extends DomainEvent {
  constructor(
    readonly txId: string,
    readonly paymentId: string,
    readonly contractAddress: string,
    readonly methodName: string,
    readonly args: unknown[]
  ) {
    super(txId);
  }

  getEventType(): string {
    return 'blockchain.tx.initiated';
  }

  getEventName(): string {
    return 'Blockchain Transaction Initiated';
  }
}

/**
 * Fired when a blockchain transaction is confirmed
 */
export class BlockchainTransactionConfirmedEvent extends DomainEvent {
  constructor(
    readonly txId: string,
    readonly txHash: string,
    readonly blockNumber: bigint,
    readonly blockHash: string,
    readonly gasUsed: bigint
  ) {
    super(txId);
  }

  getEventType(): string {
    return 'blockchain.tx.confirmed';
  }

  getEventName(): string {
    return 'Blockchain Transaction Confirmed';
  }
}

/**
 * Fired when a blockchain transaction fails
 */
export class BlockchainTransactionFailedEvent extends DomainEvent {
  constructor(
    readonly txId: string,
    readonly reason: string,
    readonly error?: string
  ) {
    super(txId);
  }

  getEventType(): string {
    return 'blockchain.tx.failed';
  }

  getEventName(): string {
    return 'Blockchain Transaction Failed';
  }
}

// ============================================================================
// WEBHOOK EVENTS
// ============================================================================

/**
 * Fired when an Asaas webhook is received
 */
export class AsaasWebhookReceivedEvent extends DomainEvent {
  constructor(
    readonly webhookId: string,
    readonly event: string,
    readonly payload: Record<string, unknown>
  ) {
    super(webhookId);
  }

  getEventType(): string {
    return 'asaas.webhook.received';
  }

  getEventName(): string {
    return 'Asaas Webhook Received';
  }
}

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

/**
 * Fired when the system starts
 */
export class SystemStartedEvent extends DomainEvent {
  override readonly version: number = 1;

  constructor(
    readonly appVersion: string,
    readonly environment: string
  ) {
    super('system');
  }

  getEventType(): string {
    return 'system.started';
  }

  getEventName(): string {
    return 'System Started';
  }
}

/**
 * Fired when an error occurs
 */
export class SystemErrorEvent extends DomainEvent {
  constructor(
    readonly context: string,
    readonly error: string,
    readonly stack?: string
  ) {
    super('system');
  }

  getEventType(): string {
    return 'system.error';
  }

  getEventName(): string {
    return 'System Error';
  }
}

export type AppDomainEvent =
  | PaymentReceivedEvent
  | PaymentConfirmedEvent
  | PaymentFailedEvent
  | BlockchainTransactionInitiatedEvent
  | BlockchainTransactionConfirmedEvent
  | BlockchainTransactionFailedEvent
  | AsaasWebhookReceivedEvent
  | SystemStartedEvent
  | SystemErrorEvent;
