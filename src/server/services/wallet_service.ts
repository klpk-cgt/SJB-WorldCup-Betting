/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 统一钱包服务
 *
 * 所有钱包余额变动和交易流水写入必须通过此服务，
 * 禁止 route 或其他模块直接修改 wallet.balance 或 push transaction。
 *
 * 核心方法：
 * - adjustWalletBalance：统一钱包变动入口，自动写 transaction
 */

import { dbService } from '../../db/db_service';
import { Wallet, Transaction, TransactionType } from '../../types';
import { createId, roundPoints } from '../helpers';
import logger from '../logger';

interface AdjustWalletParams {
  userId: string;
  amount: number;
  type: TransactionType;
  note: string;
  relatedPredictionId?: string;
  relatedMatchId?: string;
}

interface AdjustWalletResult {
  wallet: Wallet;
  transaction: Transaction;
}

/**
 * 统一钱包余额变动方法
 *
 * - amount 可以正负
 * - 扣款前校验余额不能小于 0
 * - 自动写 transaction
 * - 自动记录 balanceBefore / balanceAfter
 *
 * 注意：此方法必须在 runBusinessTransaction 内部调用，
 * 不自行调用 dbService.save()，由 transaction_guard 统一保存。
 */
export function adjustWalletBalance(params: AdjustWalletParams): AdjustWalletResult {
  const db = dbService.getData();
  const wallet = db.wallets.find((w) => w.userId === params.userId);
  if (!wallet) {
    throw new Error(`钱包不存在：userId=${params.userId}`);
  }

  const amount = roundPoints(params.amount);
  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore + amount;

  // 扣款校验：余额不能小于 0
  if (balanceAfter < 0) {
    throw new Error(`余额不足：当前 ${balanceBefore}，需要 ${Math.abs(amount)}，差额 ${-balanceAfter}`);
  }

  wallet.balance = balanceAfter;

  const transaction: Transaction = {
    id: createId('tx'),
    userId: params.userId,
    type: params.type,
    amount,
    balanceBefore,
    balanceAfter,
    relatedPredictionId: params.relatedPredictionId,
    relatedMatchId: params.relatedMatchId,
    note: params.note,
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(transaction);

  logger.info(`[WalletService] ${params.type} userId=${params.userId} amount=${amount} balance=${balanceBefore}->${balanceAfter}`);

  return { wallet, transaction };
}

/**
 * 查询用户钱包（只读）
 */
export function getWallet(userId: string): Wallet | undefined {
  return dbService.getData().wallets.find((w) => w.userId === userId);
}

/**
 * 查询用户钱包（只读，不存在则抛异常）
 */
export function getWalletOrThrow(userId: string): Wallet {
  const wallet = getWallet(userId);
  if (!wallet) {
    throw new Error(`钱包不存在：userId=${userId}`);
  }
  return wallet;
}
