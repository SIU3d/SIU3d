import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { UpgradeEvent } from '../models';
import { findUpgradeRightForProductLine } from './products';
import { getAccount } from './trustFund';

export function simulateUpgrade(userId: string, currentProductId: string, targetProductId: string): UpgradeEvent & {
  trustFundBalance: number;
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
  };
  db.upgradeEvents.push(event);

  const trust = getAccount(userId);
  const trustBalance = trust?.balance ?? 0;
  const afterUpgrade = Math.max(trustBalance - event.upgradeFee, 0);

  return { ...event, trustFundBalance: trustBalance, hypotheticalBalanceAfterUpgrade: afterUpgrade };
}
