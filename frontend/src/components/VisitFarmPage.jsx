import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon paths
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function VisitFarmPage() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_phone: '',
    visitor_email: '',
    visit_date: '',
    farm_id: ''
  });
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState(null);

  const parseWKT = (wkt) => {
    if (!wkt || !wkt.startsWith('POLYGON')) return null;
    const match = wkt.match(/POLYGON\s*\(\((.*)\)\)/);
    if (!match) return null;
    return match[1].split(',').map(p => {
      const [lng, lat] = p.trim().split(' ');
      return [parseFloat(lat), parseFloat(lng)];
    });
  };

  const getFirstCoordinate = (wkt) => {
    const points = parseWKT(wkt);
    if (points && points.length > 0) {
      return `${points[0][0]}, ${points[0][1]}`;
    }
    return null;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Coordinates copied to clipboard!');
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const res = await fetch('api/public_farms.php');
      const data = await res.json();
      if (res.ok) {
        setFarms(data);
      }
    } catch (err) {
      console.error("Failed to fetch farms");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      const res = await fetch('api/book_visit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSubmitStatus({ type: 'success', message: 'Your visit request has been received! We will contact you shortly.' });
        setFormData({ visitor_name: '', visitor_phone: '', visitor_email: '', visit_date: '', farm_id: '' });
      } else {
        setSubmitStatus({ type: 'error', message: data.error || 'Something went wrong.' });
      }
    } catch (err) {
      setSubmitStatus({ type: 'error', message: 'Failed to connect to the server.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20">
      {/* Header */}
      <header className="bg-slate-800 border-b border-emerald-900/50 p-4 sticky top-0 z-50 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-emerald-500/20">
            SB
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white leading-tight">Sahasra Bharat</h1>
            <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">Farm Visits</p>
          </div>
        </div>
        <a href="/" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition text-white">
          Back Home
        </a>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Experience Nature with Us</h2>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
            Step away from the city and immerse yourself in the lush greenery of Sahasra Bharat farms. 
            Book a visit to explore sustainable agriculture firsthand.
          </p>
        </div>

        {/* Gallery */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <img src="farmvisit.jpeg" alt="Farm Visit" className="w-full h-48 object-cover rounded-2xl shadow-lg hover:scale-105 transition duration-300 col-span-2 md:col-span-2 row-span-2 md:h-full" />
          <img src="farmvisit2.jpeg" alt="Farm Visit" className="w-full h-48 object-cover rounded-2xl shadow-lg hover:scale-105 transition duration-300" />
          <img src="farmvisit3.jpeg" alt="Farm Visit" className="w-full h-48 object-cover rounded-2xl shadow-lg hover:scale-105 transition duration-300" />
          <img src="farmvisit4.jpeg" alt="Farm Visit" className="w-full h-48 object-cover rounded-2xl shadow-lg hover:scale-105 transition duration-300" />
          <img src="farmvisit5.jpeg" alt="Farm Visit" className="w-full h-48 object-cover rounded-2xl shadow-lg hover:scale-105 transition duration-300" />
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Farms List */}
          <div>
            <h3 className="text-2xl font-bold mb-6 text-white border-b border-slate-700 pb-2">Available Farms</h3>
            {loading ? (
              <div className="text-center py-10 text-slate-500">Loading farms...</div>
            ) : farms.length === 0 ? (
              <div className="text-center py-10 text-slate-500 bg-slate-800/50 rounded-2xl border border-slate-700">
                No farms registered yet.
              </div>
            ) : (
              <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {farms.map(farm => (
                  <div 
                    key={farm.id} 
                    onClick={() => setSelectedFarm(farm)}
                    className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-emerald-500 hover:bg-slate-750 cursor-pointer transition relative overflow-hidden group shadow-md hover:shadow-emerald-900/20"
                  >
                    <div className="absolute top-0 right-0 p-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${farm.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {farm.status}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-1">{farm.name || `Farm #${farm.id}`}</h4>
                    <div className="text-xs text-slate-400 mb-3 capitalize">{farm.type.replace(/_/g, ' ')} • {farm.farming_type.replace(/_/g, ' ')}</div>
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 rounded-lg text-xs font-mono text-emerald-400">
                      {farm.total_area_acres} Acres
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Booking Form */}
          <div>
            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
              
              <h3 className="text-2xl font-bold mb-2 text-white">Book Your Visit</h3>
              <p className="text-slate-400 text-xs mb-6">Fill out the form below and our team will get back to you to confirm your schedule.</p>
              
              {submitStatus.message && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-bold ${submitStatus.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {submitStatus.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Full Name *</label>
                  <input 
                    type="text" 
                    name="visitor_name"
                    value={formData.visitor_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition"
                    required 
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Phone Number *</label>
                    <input 
                      type="tel" 
                      name="visitor_phone"
                      value={formData.visitor_phone}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition"
                      required 
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Email Address</label>
                    <input 
                      type="email" 
                      name="visitor_email"
                      value={formData.visitor_email}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Preferred Visit Date *</label>
                  <input 
                    type="date" 
                    name="visit_date"
                    value={formData.visit_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Specific Farm to Visit (Optional)</label>
                  <select 
                    name="farm_id"
                    value={formData.farm_id}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition"
                  >
                    <option value="">-- I'm open to suggestions --</option>
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>{f.name || `Farm #${f.id}`} ({f.total_area_acres} Acres)</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl mt-4 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Request Farm Visit'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Farm Details Modal */}
      {selectedFarm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedFarm(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50">
              <div>
                <h2 className="text-2xl font-black text-white">{selectedFarm.name || `Farm #${selectedFarm.id}`}</h2>
                <p className="text-emerald-400 font-mono text-sm uppercase tracking-widest">{selectedFarm.total_area_acres} Acres • {selectedFarm.type.replace(/_/g, ' ')}</p>
              </div>
              <button onClick={() => setSelectedFarm(null)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 grid md:grid-cols-2 gap-8 custom-scrollbar">
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Farm Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Farming Type</p>
                    <p className="text-white font-medium capitalize">{selectedFarm.farming_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Soil Type</p>
                    <p className="text-white font-medium capitalize">{selectedFarm.soil_type ? selectedFarm.soil_type.replace(/_/g, ' ') : 'N/A'}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Water Source</p>
                    <p className="text-white font-medium capitalize">{selectedFarm.water_source ? selectedFarm.water_source.replace(/_/g, ' ') : 'N/A'}</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Irrigation System</p>
                    <p className="text-white font-medium capitalize">{selectedFarm.irrigation_system ? selectedFarm.irrigation_system.replace(/_/g, ' ') : 'N/A'}</p>
                  </div>
                </div>

                <div className="bg-emerald-900/20 border border-emerald-500/20 p-5 rounded-2xl">
                  <h4 className="text-emerald-400 font-bold mb-2">Interested in visiting?</h4>
                  <p className="text-sm text-slate-300 mb-4">You can request a guided tour to see these sustainable practices in person.</p>
                  <button 
                    onClick={() => {
                      setFormData(prev => ({ ...prev, farm_id: selectedFarm.id }));
                      setSelectedFarm(null);
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-3 px-6 rounded-xl w-full transition shadow-lg shadow-emerald-600/20"
                  >
                    Select for Visit
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2 mb-4">Location Map</h3>
                <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 h-[350px]">
                  {selectedFarm.boundary_polygon && parseWKT(selectedFarm.boundary_polygon) ? (
                    <>
                      <MapContainer 
                        bounds={parseWKT(selectedFarm.boundary_polygon)} 
                        zoom={15} 
                        scrollWheelZoom={false} 
                        className="h-full w-full"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Polygon positions={parseWKT(selectedFarm.boundary_polygon)} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.3 }} />
                      </MapContainer>
                    </>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-500 flex-col gap-2">
                      <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      <p>Exact location not mapped yet.</p>
                    </div>
                  )}
                </div>
                {selectedFarm.boundary_polygon && getFirstCoordinate(selectedFarm.boundary_polygon) && (
                  <div className="mt-4 flex items-center justify-between bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">GPS Coordinates</p>
                      <p className="text-emerald-400 font-mono text-sm">{getFirstCoordinate(selectedFarm.boundary_polygon)}</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(getFirstCoordinate(selectedFarm.boundary_polygon))}
                      className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default VisitFarmPage;
