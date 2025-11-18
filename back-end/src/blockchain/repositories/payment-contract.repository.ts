import { Injectable } from '@nestjs/common';
import { Abi } from 'viem';
import { BaseContractRepository } from './base-contract.repository';
import { EnvService } from '@core/config/env.service';
import { LoggerService } from '@core/logger/logger.service';

/**
 * Payment Contract Repository
 *
 * Specialized repository for Payment smart contract interactions.
 * Handles:
 * - Recording payments on-chain
 * - Confirming payments
 * - Reading payment state
 * - Emitting payment events
 *
 * @example
 * const txHash = await this.paymentContract.recordPayment(
 *   paymentId,
 *   amount,
 *   payer,
 *   'PIX Payment from customer'
 * );
 * await this.paymentContract.waitForConfirmation(txHash);
 */
@Injectable()
export class PaymentContractRepository extends BaseContractRepository {
  private abi!: unknown;
  private contractAddress!: string;

  constructor(envService: EnvService, loggerService: LoggerService) {
    super(envService, loggerService, 'PaymentContract');
    this.initializeContract();
  }

  /**
   * Initialize contract
   */
  private initializeContract(): void {
    const config = this.envService.getBlockchainConfig();

    // Load ABI from file
    this.abi = this.loadAbiFromFile(config.contractPaymentAbiPath);

    // Validate contract address
    if (!config.contractPaymentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid payment contract address');
    }

    this.contractAddress = config.contractPaymentAddress;

    this.logger.info('Payment contract initialized', {
      address: this.contractAddress,
    });
  }

  /**
   * Record payment on-chain
   * Calls: recordPayment(bytes32 paymentId, uint256 amount, address payer, string description)
   */
  async recordPayment(
    paymentId: string,
    amount: bigint,
    payer: string,
    description: string
  ): Promise<{ txHash: string; wait: () => Promise<void> }> {
    this.logger.info('Recording payment on-chain', {
      paymentId,
      amount: amount.toString(),
      payer,
      description,
    });

    // Convert paymentId UUID to bytes32
    const paymentIdBytes32 = this.uuidToBytes32(paymentId);

    // Mock implementation - return placeholder tx hash
    const txHash = this.mockTransactionHash();

    return {
      txHash,
      wait: async () => {
        this.logger.info(`Transaction confirmed: ${txHash}`);
      },
    };
  }

  /**
   * Confirm payment on-chain
   * Calls: confirmPayment(bytes32 paymentId)
   */
  async confirmPayment(paymentId: string): Promise<{ txHash: string; wait: () => Promise<void> }> {
    this.logger.info('Confirming payment on-chain', { paymentId });

    const paymentIdBytes32 = this.uuidToBytes32(paymentId);

    // Mock implementation
    const txHash = this.mockTransactionHash();

    return {
      txHash,
      wait: async () => {
        this.logger.info(`Transaction confirmed: ${txHash}`);
      },
    };
  }

  /**
   * Get payment from contract
   * Calls: getPayment(bytes32 paymentId)
   */
  async getPayment(paymentId: string): Promise<{
    amount: bigint;
    payer: string;
    timestamp: bigint;
    confirmed: boolean;
  }> {
    this.logger.info('Fetching payment from contract', { paymentId });

    const paymentIdBytes32 = this.uuidToBytes32(paymentId);

    // Mock implementation
    return {
      amount: BigInt(0),
      payer: '0x0000000000000000000000000000000000000000',
      timestamp: BigInt(0),
      confirmed: false,
    };
  }

  /**
   * Get contract balance
   * Calls: getBalance()
   */
  async getContractBalance(): Promise<bigint> {
    this.logger.info('Fetching contract balance');

    // Mock implementation
    return BigInt(0);
  }

  /**
   * Check if payment exists and is confirmed
   */
  async isPaymentConfirmed(paymentId: string): Promise<boolean> {
    try {
      const payment = await this.getPayment(paymentId);
      return payment.confirmed;
    } catch (error) {
      this.logger.warn('Payment not found on contract', { paymentId, error });
      return false;
    }
  }

  /**
   * Convert UUID to bytes32 format
   * Removes hyphens and converts to hex
   *
   * Example: "550e8400-e29b-41d4-a716-446655440000" -> 0x550e8400e29b41d4a716446655440000
   */
  private uuidToBytes32(uuid: string): string {
    const hex = uuid.replace(/-/g, '');
    if (hex.length !== 32) {
      throw new Error(`Invalid UUID format: ${uuid}`);
    }
    return `0x${hex}`;
  }

  /**
   * Convert bytes32 to UUID format
   */
  private bytes32ToUuid(bytes32: string): string {
    let hex = bytes32.replace(/^0x/, '');

    if (hex.length !== 32) {
      throw new Error(`Invalid bytes32 format: ${bytes32}`);
    }

    // Insert hyphens at correct positions: 8-4-4-4-12
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32),
    ].join('-');
  }

  /**
   * Generate mock transaction hash for development
   */
  private mockTransactionHash(): string {
    return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  }
}
