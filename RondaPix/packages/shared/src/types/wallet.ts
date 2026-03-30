export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'BET_PLACED'
  | 'BET_WON'
  | 'BET_REFUNDED'
  | 'BONUS'
  | 'ADJUSTMENT';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Wallet {
  readonly id: string;
  readonly userId: string;
  readonly balance: number;
  readonly lockedBalance: number;
  readonly currency: 'COINS';
  readonly updatedAt: Date;
}

export interface WalletTransaction {
  readonly id: string;
  readonly walletId: string;
  readonly userId: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly balanceBefore: number;
  readonly balanceAfter: number;
  readonly status: TransactionStatus;
  readonly referenceId: string | null;
  readonly description: string;
  readonly createdAt: Date;
}
