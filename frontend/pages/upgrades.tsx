import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import AuthPanel from '../components/AuthPanel';
import { apiFetch, loadSession, UserSession } from '../lib/api';

interface Product {
  id: string;
  name: string;
  productLineId: string;
  generation: number;
  basePrice: number;
}

interface Ownership {
  id: string;
  productId: string;
  productLineId: string;
  ownedGeneration: number;
}

interface Simulation {
  lockedPrice: number;
  assumedRecoveryValue: number;
  upgradeFee: number;
  trustFundBalance: number;
  hypotheticalBalanceAfterUpgrade: number;
  oldProductId: string;
  newProductId: string;
}

export default function UpgradeSimulator() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [owned, setOwned] = useState<Ownership[]>([]);
  const [currentProduct, setCurrentProduct] = useState<string>('');
  const [targetProduct, setTargetProduct] = useState<string>('');
  const [result, setResult] = useState<Simulation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (sess?: UserSession) => {
    const prod = await apiFetch<Product[]>('/api/products');
    setProducts(prod);
    if (sess) {
      const ownedItems = await apiFetch<Ownership[]>('/api/products/owned', sess.token);
      setOwned(ownedItems);
    }
  };

  useEffect(() => {
    const existing = loadSession();
    if (existing) {
      setSession(existing);
      loadData(existing).catch(() => undefined);
    } else {
      loadData().catch(() => undefined);
    }
  }, []);

  const onAuthChange = (sess: UserSession | null) => {
    setSession(sess);
    setResult(null);
    if (sess) {
      loadData(sess).catch(() => undefined);
    } else {
      setOwned([]);
    }
  };

  const simulate = async () => {
    if (!session) return;
    try {
      setError(null);
      const data = await apiFetch<Simulation>('/api/upgrades/simulate', session.token, {
        method: 'POST',
        body: JSON.stringify({ current_product_id: currentProduct, target_product_id: targetProduct }),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const ownedProducts = owned.map((o) => ({
    ...o,
    product: products.find((p) => p.id === o.productId),
  }));
  const newerProducts = products.filter((p) => {
    const current = products.find((c) => c.id === currentProduct);
    if (!current) return false;
    return p.productLineId === current.productLineId && p.generation > current.generation;
  });

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AuthPanel onAuthChange={onAuthChange} />

        <div className="bg-white p-4 rounded shadow space-y-3">
          <h2 className="font-semibold">Upgrade Simulator</h2>
          {session ? (
            <>
              <label className="block text-sm font-medium">Select owned product</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={currentProduct}
                onChange={(e) => setCurrentProduct(e.target.value)}
              >
                <option value="">Select</option>
                {ownedProducts.map((o) => (
                  <option key={o.id} value={o.productId}>
                    {o.product?.name} (Gen {o.ownedGeneration})
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium">Select target generation</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={targetProduct}
                onChange={(e) => setTargetProduct(e.target.value)}
              >
                <option value="">Select</option>
                {newerProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Gen {p.generation})
                  </option>
                ))}
              </select>

              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={simulate} disabled={!currentProduct || !targetProduct}>
                Simulate
              </button>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {result && (
                <div className="border rounded p-3 space-y-2">
                  <p className="font-medium">Locked price: ${result.lockedPrice.toFixed(2)}</p>
                  <p>Recovery value: ${result.assumedRecoveryValue.toFixed(2)}</p>
                  <p className="font-semibold">Upgrade fee: ${result.upgradeFee.toFixed(2)}</p>
                  <p className="text-sm text-gray-700">Trust fund balance: ${result.trustFundBalance.toFixed(2)}</p>
                  <p className="text-sm text-gray-700">Hypothetical balance after paying fee: ${result.hypotheticalBalanceAfterUpgrade.toFixed(2)}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">Login to simulate upgrades.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
