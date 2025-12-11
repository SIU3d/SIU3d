import { v4 as uuid } from 'uuid';
import {
  Product,
  TrustFundAccount,
  UpgradeEvent,
  UpgradeRight,
  User,
  UserProductOwnership,
} from './models';
import { hashPassword } from './utils/passwords';

interface Database {
  users: User[];
  trustFunds: TrustFundAccount[];
  products: Product[];
  ownerships: UserProductOwnership[];
  upgradeRights: UpgradeRight[];
  upgradeEvents: UpgradeEvent[];
}

const now = new Date();

export const db: Database = {
  users: [],
  trustFunds: [],
  products: [
    {
      id: uuid(),
      name: 'Console Gen 1',
      sku: 'console-gen1',
      basePrice: 500,
      generation: 1,
      createdAt: now,
    },
    {
      id: uuid(),
      name: 'Console Gen 2',
      sku: 'console-gen2',
      basePrice: 600,
      generation: 2,
      createdAt: now,
    },
    {
      id: uuid(),
      name: 'Phone Gen 1',
      sku: 'phone-gen1',
      basePrice: 900,
      generation: 1,
      createdAt: now,
    },
    {
      id: uuid(),
      name: 'Phone Gen 2',
      sku: 'phone-gen2',
      basePrice: 1050,
      generation: 2,
      createdAt: now,
    },
  ],
  ownerships: [],
  upgradeRights: [],
  upgradeEvents: [],
};

export function createUser(email: string, password: string): { user: User; trustFund: TrustFundAccount } {
  const existing = db.users.find((u) => u.email === email);
  if (existing) {
    throw new Error('Email already registered');
  }
  const hashedPassword = hashPassword(password);
  const user: User = {
    id: uuid(),
    email,
    hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const trustFund: TrustFundAccount = {
    id: uuid(),
    userId: user.id,
    balance: 0,
    annualYieldRate: 0.05,
    lastYieldAppliedAt: new Date(),
  };
  db.users.push(user);
  db.trustFunds.push(trustFund);
  return { user, trustFund };
}
