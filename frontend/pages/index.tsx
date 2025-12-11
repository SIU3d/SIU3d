import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import AuthPanel from '../components/AuthPanel';
import { apiFetch, UserSession, loadSession } from '../lib/api';

interface TrustFundAccount {
  balance: number;
  annualYieldRate: number;
  lastYieldAppliedAt: string;
}

interface Ownership {
  id: string;
  productId: string;
  originalPricePaid: number;
  ownedGeneration: number;
  status: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  generation: number;
}

export default function Dashboard() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [trustFund, setTrustFund] = useState<TrustFundAccount | null>(null);
  const [owned, setOwned] = useState<(Ownership & { product?: Product })[]>([]);

  const refreshData = async (sess: UserSession) => {
    const tf = await apiFetch<TrustFundAccount>('/api/trust-fund/me', sess.token);
    const ownedItems = await apiFetch<Ownership[]>('/api/products/owned', sess.token);
    const products = await apiFetch<Product[]>('/api/products');
    const combined = ownedItems.map((o) => ({ ...o, product: products.find((p) => p.id === o.productId) }));
    setTrustFund(tf);
    setOwned(combined);
  };

  useEffect(() => {
    const existing = loadSession();
    if (existing) {
      setSession(existing);
      refreshData(existing).catch(() => undefined);
    }
  }, []);

  const onAuthChange = (sess: UserSession | null) => {
    setSession(sess);
    if (sess) {
      refreshData(sess).catch(() => undefined);
    } else {
      setTrustFund(null);
      setOwned([]);
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AuthPanel onAuthChange={onAuthChange} />

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Trust Fund Snapshot</h2>
          {session && trustFund ? (
            <div className="space-y-2">
              <p className="text-2xl font-bold">${trustFund.balance.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Annual yield rate: {(trustFund.annualYieldRate * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Last applied: {new Date(trustFund.lastYieldAppliedAt).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Login to view your trust fund.</p>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Your Products</h3>
        {session ? (
          owned.length > 0 ? (
            <ul className="divide-y">
              {owned.map((o) => (
                <li key={o.id} className="py-2 flex justify-between">
                  <div>
                    <p className="font-medium">{o.product?.name || 'Unknown Product'}</p>
                    <p className="text-xs text-gray-500">Generation {o.ownedGeneration} • Paid ${o.originalPricePaid}</p>
                  </div>
                  <span className="text-xs text-gray-600">Status: {o.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No products registered yet.</p>
          )
        ) : (
          <p className="text-sm text-gray-600">Login to see owned products.</p>
        )}
      </div>
    </Layout>
  );
}
