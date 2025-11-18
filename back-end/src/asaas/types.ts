/**
 * Asaas Data Types and Interfaces
 *
 * Type definitions for Asaas API responses and webhook payloads
 */

/**
 * Asaas Customer
 */
export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
  notificationDisabled?: boolean;
  deleted?: boolean;
  createdAt?: string;
}

/**
 * Asaas Payment Status
 */
export enum AsaasPaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  RECEIVED = 'RECEIVED',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED',
  OVERDUE = 'OVERDUE',
  DUNNED = 'DUNNED',
}

/**
 * Asaas Payment
 */
export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  paymentLink?: string;
  value: number;
  netValue?: number;
  originalValue?: number;
  interestValue?: number;
  description: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  status: AsaasPaymentStatus;
  dueDate: string;
  originalDueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  externalReference?: string;
  anticipated?: boolean;
  anticipable?: boolean;
  nostroNumber?: string;
  bankSlipUrl?: string;
  deleted?: boolean;
  creditDate?: string;
  estimatedCreditDate?: string;
  transactionReceiptUrl?: string;
  lastBankSlipRequestDate?: string;
  lastInvoiceRequestDate?: string;
  chargeback?: AsaasChargeback;
  refunds?: AsaasRefund[];
  createdAt?: string;
}

/**
 * Asaas Chargeback
 */
export interface AsaasChargeback {
  status: string;
  reason: string;
  requesterDocument: string;
  amount: number;
  date: string;
}

/**
 * Asaas Refund
 */
export interface AsaasRefund {
  refundDate: string;
  value: number;
  status: string;
}

/**
 * Asaas PIX Key
 */
export interface AsaasPixKey {
  id: string;
  key: string;
  type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt: string;
}

/**
 * Asaas Webhook Event Types
 */
export enum AsaasWebhookEventType {
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_UPDATED = 'payment.updated',
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_CONFIRMED = 'payment.confirmed',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_OVERDUE = 'payment.overdue',
  PAYMENT_DUNNED = 'payment.dunned',
  PAYMENT_DELETED = 'payment.deleted',
  PAYMENT_RESTORED = 'payment.restored',
  PAYMENT_CHARGEBACK = 'payment.chargeback',
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
}

/**
 * Asaas Webhook Notification
 */
export interface AsaasWebhookNotification {
  id: string;
  event: AsaasWebhookEventType;
  createdAt: string;
  data: {
    id: string;
    object: string;
    account: string;
    customer?: string;
    subscription?: string;
    paymentLink?: string;
    installment?: string;
    value?: number;
    netValue?: number;
    originalValue?: number;
    interestValue?: number;
    description?: string;
    billingType?: string;
    confirmedDate?: string;
    pixAddressKey?: string;
    status?: string;
    dueDate?: string;
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
    chargeback?: AsaasChargeback;
    refunds?: AsaasRefund[];
    createdAt?: string;
    [key: string]: unknown;
  };
}

/**
 * Asaas API Error Response
 */
export interface AsaasErrorResponse {
  errors: Array<{
    detail: string;
    error: string;
  }>;
}

/**
 * Asaas API Success Response
 */
export interface AsaasSuccessResponse<T> {
  data?: T;
  object?: string;
  id?: string;
  [key: string]: unknown;
}
