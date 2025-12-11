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
    originalPricePaid: pricePaid,
    ownedGeneration: product.generation,
    status: 'ACTIVE',
    createdAt: new Date(),
  };
  db.ownerships.push(ownership);

  const existingRight = db.upgradeRights.find((u) => u.userId === userId && u.productId === productId);
  if (existingRight) {
    return { ownership };
  }

  const upgradeRight: UpgradeRight = {
    id: uuid(),
    userId,
    productId,
    lockedPrice: pricePaid,
    currentGeneration: product.generation,
    createdAt: new Date(),
  };
  db.upgradeRights.push(upgradeRight);
  return { ownership, upgradeRight };
}

export function findUpgradeRightForProductLine(userId: string, productId: string): UpgradeRight | undefined {
  return db.upgradeRights.find((u) => u.userId === userId && u.productId === productId);
}

export function listOwnerships(userId: string): UserProductOwnership[] {
  return db.ownerships.filter((o) => o.userId === userId);
}
