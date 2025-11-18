import { Injectable } from '@nestjs/common';
import { EnvService } from '@core/config/env.service';
import { LoggerService } from '@core/logger/logger.service';
import { BlockchainException, ErrorCode } from '@core/errors/app.exceptions';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Base Contract Repository
 *
 * Provides abstractions for smart contract interactions using viem.
 * Handles:
 * - Reading contract state
 * - Writing to contracts (transactions)
 * - Gas estimation
 * - ABI management
 * - Error handling and retries
 *
 * @example
 * export class PaymentContractRepository extends BaseContractRepository {
 *   async recordPayment(amount: bigint) {
 *     return this.write({
 *       functionName: 'recordPayment',
 *       args: [amount],
 *     });
 *   }
 * }
 */
@Injectable()
export abstract class BaseContractRepository {
  protected logger;
  protected rpcUrl: string;
  protected chainId: number;
  protected privateKey: string;

  constructor(
    protected envService: EnvService,
    protected loggerService: LoggerService,
    protected contractName: string
  ) {
    this.logger = this.loggerService.createLogger(`${contractName}Repository`);

    const config = this.envService.getBlockchainConfig();

    this.rpcUrl = config.rpcUrl;
    this.chainId = config.chainId;
    this.privateKey = this.normalizePrivateKey(config.privateKey);

    this.logger.info(`${contractName} repository initialized`, {
      chainId: config.chainId,
      rpcUrl: config.rpcUrl.substring(0, 30) + '...',
    });
  }

  /**
   * Get ABI from file
   */
  protected loadAbiFromFile(abiPath: string): unknown {
    try {
      const fullPath = path.resolve(process.cwd(), abiPath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`ABI file not found: ${fullPath}`);
      }

      const abiContent = fs.readFileSync(fullPath, 'utf-8');
      const abi = JSON.parse(abiContent) as unknown;

      this.logger.info(`ABI loaded from ${abiPath}`);
      return abi;
    } catch (error) {
      this.logger.error(`Failed to load ABI from ${abiPath}`, error instanceof Error ? error : new Error(String(error)));
      throw new BlockchainException(
        ErrorCode.BLOCKCHAIN_TRANSACTION_FAILED,
        `Failed to load ABI: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Normalize private key format
   */
  protected normalizePrivateKey(key: string): string {
    if (!key.startsWith('0x')) {
      return `0x${key}`;
    }
    return key;
  }

  /**
   * Placeholder methods for contract interactions
   * These will be implemented by subclasses using viem
   */
  protected async read<T = unknown>(_params: unknown): Promise<T> {
    throw new Error('read() must be implemented by subclass');
  }

  protected async write(_params: unknown): Promise<{ txHash: string; wait: () => Promise<void> }> {
    throw new Error('write() must be implemented by subclass');
  }

  async getGasPrice(): Promise<bigint> {
    throw new Error('getGasPrice() must be implemented by subclass');
  }

  async getBalance(): Promise<bigint> {
    throw new Error('getBalance() must be implemented by subclass');
  }
}
