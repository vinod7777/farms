import React, { useState, useEffect } from 'react';

export default function AddressManager({ token, onAddressChange }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '', mobile: '', alternate: '', house: '', area: ''
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetch('api/addresses.php', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAddresses(data.addresses || []);
        if (data.addresses && data.addresses.length > 0) {
          selectAddress(data.addresses[0]);
        } else {
          setShowForm(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectAddress = (addr) => {
    setSelectedId(addr.id);
    const fullText = `Name: ${addr.full_name}\nMobile: ${addr.mobile} ${addr.alternate_mobile ? `(Alt: ${addr.alternate_mobile})` : ''}\nFlat/House: ${addr.house}\nArea/Locality: ${addr.area}`;
    onAddressChange(fullText);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('api/addresses.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          full_name: formData.fullName,
          mobile: formData.mobile,
          alternate_mobile: formData.alternate,
          house: formData.house,
          area: formData.area
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAddresses([data.address, ...addresses]);
        selectAddress(data.address);
        setShowForm(false);
        setFormData({ fullName: '', mobile: '', alternate: '', house: '', area: '' });
      } else {
        alert(data.error || 'Failed to save address');
      }
    } catch (e) {
      alert('Error saving address');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-sm text-slate-500 font-medium bg-slate-50 rounded-2xl animate-pulse">Loading your addresses...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 text-lg">Delivery Address</h3>
        {!showForm && addresses.length > 0 && (
          <button type="button" onClick={() => setShowForm(true)} className="text-xs font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">+ Add New Address</button>
        )}
      </div>

      {!showForm && addresses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 pb-2">
          {addresses.map(addr => (
            <div 
              key={addr.id} 
              onClick={() => selectAddress(addr)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedId === addr.id ? 'border-emerald-500 bg-emerald-50/30 shadow-md shadow-emerald-500/10' : 'border-slate-200 hover:border-emerald-200 bg-white hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-800 truncate pr-2">{addr.full_name}</span>
                {selectedId === addr.id && <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md shrink-0 shadow-sm shadow-emerald-500/30">SELECTED</span>}
              </div>
              <div className="text-xs text-slate-600 mb-1 leading-relaxed">{addr.house}, {addr.area}</div>
              <div className="text-xs text-slate-500 font-bold bg-slate-100/80 inline-block px-2 py-1 rounded-md mt-1">{addr.mobile} {addr.alternate_mobile && `| ${addr.alternate_mobile}`}</div>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm">
          {addresses.length > 0 && (
            <button type="button" onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to saved addresses
            </button>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition bg-white" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mobile *</label>
              <input required type="tel" pattern="[0-9]{10}" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition bg-white" placeholder="10-digit number" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Alternate (Opt)</label>
              <input type="tel" pattern="[0-9]{10}" value={formData.alternate} onChange={e => setFormData({...formData, alternate: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition bg-white" placeholder="10-digit number" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">House / Flat / Building *</label>
              <input required type="text" value={formData.house} onChange={e => setFormData({...formData, house: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition bg-white" placeholder="Flat 101, Sunshine Apts" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Area / Sector / Locality *</label>
              <input required type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition bg-white" placeholder="Gachibowli, Hyderabad" />
            </div>
          </div>
          <button type="submit" disabled={saving} className={`w-full text-white font-black text-sm py-3.5 rounded-xl transition mt-5 ${saving ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20'}`}>
            {saving ? 'Saving...' : 'Save & Use This Address'}
          </button>
        </form>
      )}
    </div>
  );
}
