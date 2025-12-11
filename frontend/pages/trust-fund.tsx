import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import AuthPanel from '../components/AuthPanel';
import { apiFetch, loadSession, UserSession } from '../lib/api';

interface TrustFundAccount {
  balance: number;
  annualYieldRate: number;
  lastYieldAppliedAt: string;
}

export default function TrustFundPage() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [trustFund, setTrustFund] = useState<TrustFundAccount | null>(null);
  const [amount, setAmount] = useState(100);
  const [message, setMessage] = useState<string | null>(null);

  const fetchAccount = async (sess: UserSession) => {
    const data = await apiFetch<TrustFundAccount>('/api/trust-fund/me', sess.token);
    setTrustFund(data);
  };

  useEffect(() => {
    const existing = loadSession();
    if (existing) {
      setSession(existing);
      fetchAccount(existing).catch(() => undefined);
    }
  }, []);

  const onAuthChange = (sess: UserSession | null) => {
    setSession(sess);
    if (sess) {
      fetchAccount(sess).catch(() => undefined);
    } else {
      setTrustFund(null);
    }
  };

  const deposit = async () => {
    if (!session) return;
    try {
      const data = await apiFetch<TrustFundAccount>('/api/trust-fund/deposit', session.token, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) }),
      });
      setTrustFund(data);
      setMessage('Deposit applied');
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  const applyYield = async () => {
    if (!session) return;
    const data = await apiFetch<TrustFundAccount>('/api/trust-fund/apply-yield', session.token, {
      method: 'POST',
    });
    setTrustFund(data);
    setMessage('Yield applied');
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AuthPanel onAuthChange={onAuthChange} />

        <div className="bg-white p-4 rounded shadow space-y-3">
          <h2 className="font-semibold">Trust Fund</h2>
          {trustFund ? (
            <div>
              <p className="text-2xl font-bold">${trustFund.balance.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Annual yield: {(trustFund.annualYieldRate * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Last applied {new Date(trustFund.lastYieldAppliedAt).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Login to view trust fund.</p>
          )}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Deposit amount</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-full"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div className="flex gap-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={deposit}>
                Deposit
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={applyYield}>
                Apply Yield
              </button>
            </div>
            {message && <p className="text-sm text-gray-700">{message}</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
