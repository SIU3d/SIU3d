import { v4 as uuid } from 'uuid';
import { db } from '../store';
import { Product, UpgradeRight, UserProductOwnership } from '../models';

export function listProducts(): Product[] {
  return db.products;
}

export function registerOwnership(userId: string, productId: string, pricePaid: number): {
  ownership: UserProductOwnership;
  upgradeRight?: UpgradeRight;
} {
  const product = db.products.find((p) => p.id === productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const ownership: UserProductOwnership = {
    id: uuid(),
    userId,
    productId,
    productLineId: product.productLineId,
    originalPricePaid: pricePaid,
    ownedGeneration: product.generation,
    status: 'ACTIVE',
    createdAt: new Date(),
  };
  db.ownerships.push(ownership);

  const existingRight = db.upgradeRights.find(
    (u) => u.userId === userId && u.productLineId === product.productLineId,
  );
  if (existingRight) {
    existingRight.currentGeneration = Math.max(existingRight.currentGeneration, product.generation);
    return { ownership };
  }

  const upgradeRight: UpgradeRight = {
    id: uuid(),
    userId,
    productLineId: product.productLineId,
    lockedPrice: pricePaid,
    currentGeneration: product.generation,
    createdAt: new Date(),
  };
  db.upgradeRights.push(upgradeRight);
  return { ownership, upgradeRight };
}

export function findUpgradeRightForProductLine(userId: string, productLineId: string): UpgradeRight | undefined {
  return db.upgradeRights.find((u) => u.userId === userId && u.productLineId === productLineId);
}

export function listOwnerships(userId: string): UserProductOwnership[] {
  return db.ownerships.filter((o) => o.userId === userId);
}
