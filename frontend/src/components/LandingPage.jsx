import React, { useState } from 'react';
import ThreeScene from './ThreeScene';

export default function LandingPage() {
  const [formData, setFormData] = useState({ 
    farmer_name: '',
    email: '',
    password: '',
    farm_name: '', 
    address: '',
    latitude: '',
    longitude: '',
    boundary_polygon: '' 
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setGeoLoading(false);
      },
      (error) => {
        alert('Unable to retrieve your location. Please check your browser permissions.');
        setGeoLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to connect to the server' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col lg:flex-row items-center justify-center p-6 gap-12">
      {/* 3D Visual Section */}
      <div className="w-full lg:w-1/2 h-[40vh] lg:h-screen flex flex-col justify-center items-center relative">
        <div className="absolute top-10 left-10 z-10 hidden md:block">
          <h1 className="text-4xl lg:text-6xl font-extrabold text-green-900 tracking-tight">Sahasra Barath</h1>
          <p className="mt-2 text-xl text-green-700 max-w-md">Cultivating a sustainable future through agroforestry and transparent carbon tracking.</p>
        </div>
        <ThreeScene />
      </div>

      {/* Registration Form */}
      <div className="w-full lg:w-1/2 max-w-2xl bg-white/90 backdrop-blur-lg p-6 md:p-8 rounded-3xl shadow-2xl border border-white/50 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 sticky top-0 bg-white/90 pb-2 z-10">Register Your Farm</h2>
        
        {result && result.success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-800 rounded-xl shadow-sm">
            <h3 className="font-bold text-lg mb-1">Success!</h3>
            <p>{result.message}</p>
            <div className="mt-3 p-3 bg-white rounded-lg flex items-center justify-between">
              <span className="text-sm text-gray-500">Your Farmer ID</span>
              <span className="font-mono text-xl font-bold text-green-600">{result.farmer_id}</span>
            </div>
          </div>
        )}

        {result && result.error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-xl">
            {result.error || "An error occurred."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details Section */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-green-800 mb-4 border-b pb-2">1. Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                  value={formData.farmer_name}
                  onChange={(e) => setFormData({...formData, farmer_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                <input 
                  type="password" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Farm Details Section */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-green-800 mb-4 border-b pb-2">2. Farm Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Farm Name *</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                  value={formData.farm_name}
                  onChange={(e) => setFormData({...formData, farm_name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Farm Address</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none h-20"
                  placeholder="Street address, city, region..."
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Location Coordinates</label>
                <div className="flex flex-col md:flex-row gap-3 mb-3">
                  <input 
                    type="text" readOnly placeholder="Latitude"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
                    value={formData.latitude}
                  />
                  <input 
                    type="text" readOnly placeholder="Longitude"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
                    value={formData.longitude}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleGetLocation}
                  disabled={geoLoading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold py-2 px-4 rounded-lg transition-colors border border-emerald-300 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {geoLoading ? 'Fetching...' : 'Get My Current Location'}
                </button>
              </div>

              <details className="group">
                <summary className="text-sm font-semibold text-gray-600 cursor-pointer list-none flex items-center gap-2">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Advanced: Provide Boundary Polygon
                </summary>
                <div className="mt-3">
                  <textarea 
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none h-24 font-mono text-xs"
                    placeholder="POLYGON((...))"
                    value={formData.boundary_polygon}
                    onChange={(e) => setFormData({...formData, boundary_polygon: e.target.value})}
                  />
                </div>
              </details>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Registering...' : 'Register Farm'}
          </button>
        </form>
      </div>
    </div>
  );
}
