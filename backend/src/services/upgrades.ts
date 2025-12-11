import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { UpgradeEvent, UserProductOwnership } from '../models';
import { findUpgradeRightForProductLine, listOwnerships } from './products';
import { getAccount } from './trustFund';

function calculateUpgrade(userId: string, currentProductId: string, targetProductId: string): {
  event: UpgradeEvent;
  trustBalance: number;
  hypotheticalBalanceAfterUpgrade: number;
} {
  const currentProduct = db.products.find((p) => p.id === currentProductId);
  const targetProduct = db.products.find((p) => p.id === targetProductId);
  if (!currentProduct || !targetProduct) {
    throw new Error('Product not found');
  }

  if (targetProduct.generation <= currentProduct.generation) {
    throw new Error('Target product must be newer generation');
  }

  if (targetProduct.productLineId !== currentProduct.productLineId) {
    throw new Error('Products must belong to the same product line');
  }

  const upgradeRight = findUpgradeRightForProductLine(userId, currentProduct.productLineId);
  if (!upgradeRight) {
    throw new Error('No upgrade right for this product');
  }

  const recoveryValue = Math.max(currentProduct.basePrice * 0.3, upgradeRight.lockedPrice * 0.3);
  const fee = Math.max(upgradeRight.lockedPrice - recoveryValue, 0);
  const event: UpgradeEvent = {
    id: uuid(),
    userId,
    oldProductId: currentProductId,
    newProductId: targetProductId,
    lockedPrice: upgradeRight.lockedPrice,
    assumedRecoveryValue: Number(recoveryValue.toFixed(2)),
    upgradeFee: Number(fee.toFixed(2)),
    createdAt: new Date(),
    mode: 'SIMULATION',
  };

  const trust = getAccount(userId);
  const trustBalance = trust?.balance ?? 0;
  const afterUpgrade = Math.max(trustBalance - event.upgradeFee, 0);

  return { event, trustBalance, hypotheticalBalanceAfterUpgrade: afterUpgrade };
}

export function simulateUpgrade(userId: string, currentProductId: string, targetProductId: string): UpgradeEvent & {
  trustFundBalance: number;
  hypotheticalBalanceAfterUpgrade: number;
} {
  const { event, trustBalance, hypotheticalBalanceAfterUpgrade } = calculateUpgrade(
    userId,
    currentProductId,
    targetProductId,
  );
  db.upgradeEvents.push(event);
  return {
    ...event,
    trustFundBalance: trustBalance,
    hypotheticalBalanceAfterUpgrade,
  };
}

export function executeUpgrade(
  userId: string,
  currentProductId: string,
  targetProductId: string,
  useTrustFund: boolean,
): UpgradeEvent & {
  trustFundBalance: number;
  trustFundBalanceAfter: number;
  ownerships: UserProductOwnership[];
} {
  const { event, trustBalance } = calculateUpgrade(userId, currentProductId, targetProductId);
  const upgradeRight = findUpgradeRightForProductLine(userId, db.products.find((p) => p.id === currentProductId)!.productLineId)!;
  const updatedEvent: UpgradeEvent = { ...event, mode: 'EXECUTION' };

  const trust = getAccount(userId);
  let appliedPayment = 0;
  if (useTrustFund && trust) {
    appliedPayment = Math.min(trust.balance, updatedEvent.upgradeFee);
    trust.balance -= appliedPayment;
  }
  updatedEvent.appliedTrustFundPayment = Number(appliedPayment.toFixed(2));
  updatedEvent.remainingCashDue = Number((updatedEvent.upgradeFee - appliedPayment).toFixed(2));

  upgradeRight.currentGeneration = Math.max(upgradeRight.currentGeneration, db.products.find((p) => p.id === targetProductId)!.generation);

  const ownerships = listOwnerships(userId);
  const existingOwnership = ownerships.find((o) => o.productId === currentProductId && o.status === 'ACTIVE');
  if (existingOwnership) {
    existingOwnership.status = 'UPGRADED';
  }

  const newOwnership: UserProductOwnership = {
    id: uuid(),
    userId,
    productId: targetProductId,
    productLineId: upgradeRight.productLineId,
    originalPricePaid: upgradeRight.lockedPrice,
    ownedGeneration: db.products.find((p) => p.id === targetProductId)!.generation,
    status: 'ACTIVE',
    createdAt: new Date(),
  };
  db.ownerships.push(newOwnership);
  ownerships.push(newOwnership);

  db.upgradeEvents.push(updatedEvent);

  return {
    ...updatedEvent,
    trustFundBalance: trustBalance,
    trustFundBalanceAfter: trust ? Number(trust.balance.toFixed(2)) : trustBalance,
    ownerships,
  };
}
