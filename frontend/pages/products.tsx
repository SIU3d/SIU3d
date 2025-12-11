import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import AuthPanel from '../components/AuthPanel';
import { apiFetch, loadSession, UserSession } from '../lib/api';

interface Product {
  id: string;
  name: string;
  productLineId: string;
  basePrice: number;
  generation: number;
}

interface Ownership {
  id: string;
  productId: string;
  productLineId: string;
  originalPricePaid: number;
  ownedGeneration: number;
  status: string;
}

export default function ProductsPage() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [owned, setOwned] = useState<Ownership[]>([]);
  const [pricePaid, setPricePaid] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);

  const loadProducts = async () => {
    const data = await apiFetch<Product[]>('/api/products');
    setProducts(data);
  };

  const loadOwned = async (sess: UserSession) => {
    const data = await apiFetch<Ownership[]>('/api/products/owned', sess.token);
    setOwned(data);
  };

  useEffect(() => {
    loadProducts().catch(() => undefined);
    const existing = loadSession();
    if (existing) {
      setSession(existing);
      loadOwned(existing).catch(() => undefined);
    }
  }, []);

  const onAuthChange = (sess: UserSession | null) => {
    setSession(sess);
    if (sess) {
      loadOwned(sess).catch(() => undefined);
    } else {
      setOwned([]);
    }
  };

  const register = async (productId: string) => {
    if (!session) return;
    try {
      const price = pricePaid[productId] ?? products.find((p) => p.id === productId)?.basePrice ?? 0;
      await apiFetch('/api/products/register', session.token, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, price_paid: Number(price) }),
      });
      setMessage('Product registered');
      loadOwned(session).catch(() => undefined);
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AuthPanel onAuthChange={onAuthChange} />

        <div className="bg-white p-4 rounded shadow space-y-3">
          <h2 className="font-semibold">Products</h2>
          <ul className="space-y-3">
            {products.map((p) => (
              <li key={p.id} className="border rounded p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-600">Generation {p.generation}</p>
                  </div>
                  <span className="text-sm text-gray-700">Base ${p.basePrice}</span>
                </div>
                {session && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="border rounded px-3 py-2 w-full"
                      placeholder={`Price paid (default ${p.basePrice})`}
                      value={pricePaid[p.id] ?? ''}
                      onChange={(e) => setPricePaid((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                    />
                    <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={() => register(p.id)}>
                      Register
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {message && <p className="text-sm text-gray-700">{message}</p>}
        </div>
      </div>

      {session && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Owned Products</h3>
          {owned.length ? (
            <ul className="divide-y">
              {owned.map((o) => (
                <li key={o.id} className="py-2 flex justify-between">
                  <div>
                    <p className="font-medium">{products.find((p) => p.id === o.productId)?.name || 'Product'}</p>
                    <p className="text-xs text-gray-500">Generation {o.ownedGeneration} • Paid ${o.originalPricePaid}</p>
                  </div>
                  <span className="text-xs text-gray-600">Status: {o.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No owned items yet.</p>
          )}
        </div>
      )}
    </Layout>
  );
}
