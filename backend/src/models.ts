export interface User {
  id: string;
  email: string;
  hashedPassword: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrustFundAccount {
  id: string;
  userId: string;
  balance: number;
  annualYieldRate: number;
  lastYieldAppliedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  productLineId: string;
  basePrice: number;
  generation: number;
  createdAt: Date;
}

export type OwnershipStatus = 'ACTIVE' | 'UPGRADED' | 'RETURNED';

export interface UserProductOwnership {
  id: string;
  userId: string;
  productId: string;
  productLineId: string;
  originalPricePaid: number;
  ownedGeneration: number;
  status: OwnershipStatus;
  createdAt: Date;
}

export interface UpgradeRight {
  id: string;
  userId: string;
  productLineId: string;
  lockedPrice: number;
  currentGeneration: number;
  maxGenerationReached?: number;
  createdAt: Date;
}

export interface UpgradeEvent {
  id: string;
  userId: string;
  oldProductId: string;
  newProductId: string;
  lockedPrice: number;
  assumedRecoveryValue: number;
  upgradeFee: number;
  createdAt: Date;
  mode?: 'SIMULATION' | 'EXECUTION';
  appliedTrustFundPayment?: number;
  remainingCashDue?: number;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
}
