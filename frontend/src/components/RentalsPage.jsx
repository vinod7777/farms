import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function RentalsPage({ token }) {
  const [farms, setFarms] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const res = await fetch('api/public_rentals.php');
      const data = await res.json();
      if (res.ok && data.success) {
        setFarms(data.rentals.farms || []);
        setPlants(data.rentals.plants || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async (itemType, itemId) => {
    try {
      const res = await fetch('api/orders.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, quantity: 1 })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Rental inquiry submitted successfully!');
      } else {
        alert(data.error || 'Failed to submit inquiry');
      }
    } catch (e) {
      alert('Error submitting inquiry');
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Rental Services</h2>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Loading rentals...</div>
      ) : (
        <>
          <section className="mb-12">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Available Farms</h3>
            {farms.length === 0 ? (
              <p className="text-slate-500">No farms currently available for rent.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {farms.map(f => (
                  <motion.div key={f.id} whileHover={{ y: -5 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-bold text-xl text-slate-900">{f.name || `Farm #${f.id}`}</h4>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                        {f.farming_type}
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium mb-4">{parseFloat(f.total_area_acres).toFixed(2)} Acres</p>
                    <button onClick={() => placeOrder('rental_farm', f.id)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl transition-colors">
                      Inquire Lease
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xl font-bold mb-4 text-slate-800">Available Plants</h3>
            {plants.length === 0 ? (
              <p className="text-slate-500">No plants currently available for rent.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {plants.map(p => (
                  <motion.div key={p.id} whileHover={{ scale: 1.05 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden">
                      {p.photo_url ? (
                        <img src={`api/${p.photo_url}`} alt={p.species} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      )}
                    </div>
                    <div className="p-4 text-center">
                      <h4 className="font-bold text-sm text-slate-900 mb-1">{p.species}</h4>
                      <p className="text-xs text-slate-500 font-mono mb-2">Farm #{p.farm_id}</p>
                      <button onClick={() => placeOrder('rental_plant', p.id)} className="w-full bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800 font-bold py-1 rounded text-xs transition-colors">
                        Inquire
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
