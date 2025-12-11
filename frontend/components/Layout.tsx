import Link from 'next/link';
import React from 'react';

interface Props {
  children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="font-bold text-lg">EverLock</span>
          <Link href="/" className="text-sm text-blue-600">Dashboard</Link>
          <Link href="/trust-fund" className="text-sm text-blue-600">Trust Fund</Link>
          <Link href="/products" className="text-sm text-blue-600">Products</Link>
          <Link href="/upgrades" className="text-sm text-blue-600">Upgrade Simulator</Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default Layout;
