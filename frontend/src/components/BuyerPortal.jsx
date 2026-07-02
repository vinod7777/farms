import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ProductsPage from './ProductsPage';
import BulkOrdersPage from './BulkOrdersPage';
import MyOrders from './MyOrders';

export default function BuyerPortal() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('sb_user') || '{}');
  const token = localStorage.getItem('sb_auth_token');
  const [activeTab, setActiveTab] = useState('products');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-emerald-100 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white">SB</div>
          <h1 className="font-bold text-slate-900">Sahasra Buyer</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/50 z-30" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-emerald-100 flex flex-col fixed h-full z-40 shadow-sm transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-emerald-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-emerald-500/20">
              SB
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-900 leading-tight">Sahasra</h1>
              <p className="text-[10px] text-emerald-700 font-mono uppercase tracking-widest bg-emerald-100 inline-block px-2 py-0.5 rounded-full mt-1">BUYER</p>
            </div>
          </div>
          <div className="mt-4 text-xs font-mono text-slate-500">
            ID: {user?.farmer_id || user?.id}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-4 px-4">Marketplace</div>
          
          <button 
            onClick={() => { setActiveTab('products'); setIsMobileMenuOpen(false); }} 
            className={`flex items-center w-full gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'products' ? 'bg-emerald-100 text-emerald-900 font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Products
          </button>
          
          <button 
            onClick={() => { setActiveTab('bulk'); setIsMobileMenuOpen(false); }} 
            className={`flex items-center w-full gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'bulk' ? 'bg-emerald-100 text-emerald-900 font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Shopping Cart
          </button>

          <button 
            onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }} 
            className={`flex items-center w-full gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'orders' ? 'bg-emerald-100 text-emerald-900 font-extrabold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            My Orders
          </button>
        </nav>

        <div className="p-4 border-t border-emerald-100 space-y-3">
          <button onClick={() => navigate('/')} className="w-full py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition text-sm">
            Landing Page
          </button>
          <button onClick={handleLogout} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 hover:text-red-700 transition text-sm border border-red-200">
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen relative">
        
        {activeTab === 'products' && (
          <div className="max-w-5xl mx-auto animate-fadeIn">
            <ProductsPage token={token} />
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="max-w-5xl mx-auto animate-fadeIn">
            <BulkOrdersPage token={token} />
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="max-w-5xl mx-auto animate-fadeIn">
            <MyOrders token={token} />
          </div>
        )}

      </main>
    </div>
  );
}
