import { v4 as uuid } from 'uuid';
import { TrustFundAccount } from '../models';
import { db } from '../store';

export function getAccount(userId: string): TrustFundAccount | undefined {
  return db.trustFunds.find((t) => t.userId === userId);
}

export function deposit(userId: string, amount: number): TrustFundAccount {
  const account = getAccount(userId);
  if (!account) {
    throw new Error('Trust fund not found');
  }
  account.balance += amount;
  return account;
}

export function applyYield(userId: string, currentDate: Date = new Date()): TrustFundAccount {
  const account = getAccount(userId);
  if (!account) {
    throw new Error('Trust fund not found');
  }
  const elapsedMs = currentDate.getTime() - account.lastYieldAppliedAt.getTime();
  const elapsedYears = elapsedMs / (1000 * 60 * 60 * 24 * 365);
  if (elapsedYears > 0) {
    const growth = account.balance * account.annualYieldRate * elapsedYears;
    account.balance += growth;
    account.lastYieldAppliedAt = currentDate;
  }
  return account;
}

export function createSimulationAccount(userId: string): TrustFundAccount {
  const account: TrustFundAccount = {
    id: uuid(),
    userId,
    balance: 0,
    annualYieldRate: 0.05,
    lastYieldAppliedAt: new Date(),
  };
  db.trustFunds.push(account);
  return account;
}
