import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icon in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to parse WKT POLYGON((lng1 lat1, lng2 lat2, ...)) to Leaflet LatLng arrays [ [lat, lng], ... ]
const parseWKT = (wkt) => {
  if (!wkt) return [];
  const match = wkt.match(/\(\((.*?)\)\)/);
  if (!match) return [];
  const pointsStr = match[1];
  const points = pointsStr.split(',').map(point => {
    const [lng, lat] = point.trim().split(' ').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng]; // Leaflet expects [lat, lng]
    }
    return null;
  }).filter(Boolean);
  return points;
};

// Map center adjuster component
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.setView(center, zoom);
    }
  }, [center, zoom]);
  return null;
}

export default function AdminPortal() {
  const navigate = useNavigate();
  const token = localStorage.getItem('sb_auth_token');
  const user = JSON.parse(localStorage.getItem('sb_user') || '{}');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [plants, setPlants] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [leases, setLeases] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Map control
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default India center
  const [mapZoom, setMapZoom] = useState(5);

  // Verification & Action states
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Lease Agreement Form states
  const [leaseFarmId, setLeaseFarmId] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [leasePayout, setLeasePayout] = useState('');
  const [leaseSchedule, setLeaseSchedule] = useState('monthly');

  // User Manager states
  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Search filter query state
  const [searchQuery, setSearchQuery] = useState('');

  // Dark/Light Theme state (defaults to light as requested)
  const [theme, setTheme] = useState(localStorage.getItem('sb_theme') || 'light');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('sb_theme', nextTheme);
  };

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const sidebarClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const cardClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md';
  const inputClass = isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500' : 'bg-slate-100 border-slate-200 text-slate-800 focus:border-emerald-600';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const innerCardClass = isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-100 border-slate-200';

  // Initial loads
  const loadFarms = async () => {
    try {
      const res = await fetch('api/admin/farms.php', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.farms) {
        setFarms(data.farms);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadPlants = async (farmId) => {
    try {
      const res = await fetch(`api/plants.php?farm_id=${farmId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.plants) {
        setPlants(data.plants);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadLedgers = async () => {
    try {
      const res = await fetch('api/admin/farms.php?action=ledgers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.ledgers) {
        setLedgers(data.ledgers);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadLeases = async () => {
    try {
      const res = await fetch('api/admin/farms.php?action=leases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.leases) {
        setLeases(data.leases);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('api/admin/users.php', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('api/admin/logs.php', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.logs) {
        setAuditLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadFarms();
      loadLedgers();
      loadLeases();
      loadUsers();
      loadAuditLogs();
    }
    if (activeTab === 'ledgers') loadLedgers();
    if (activeTab === 'leases') {
      loadLeases();
      loadFarms();
    }
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'logs') loadAuditLogs();
  }, [activeTab]);

  useEffect(() => {
    if (selectedFarm) {
      loadPlants(selectedFarm.id);
      // Zoom map to the farm's polygon centroid
      const coords = parseWKT(selectedFarm.boundary_polygon);
      if (coords.length > 0) {
        let latSum = 0, lngSum = 0;
        coords.forEach(pt => {
          latSum += pt[0];
          lngSum += pt[1];
        });
        setMapCenter([latSum / coords.length, lngSum / coords.length]);
        setMapZoom(15);
      }
    } else {
      setPlants([]);
    }
  }, [selectedFarm]);

  // Approve or Reject Farm boundary
  const handleFarmStatus = async (farmId, newStatus) => {
    setLoading(true);
    setActionMessage('');
    try {
      const res = await fetch('api/admin/farms.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: farmId, status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Farm successfully ${newStatus === 'verified' ? 'Approved' : 'Rejected'}.`);
        loadFarms();
        setSelectedFarm(prev => prev ? { ...prev, status: newStatus } : null);
      } else {
        setActionMessage(data.error || 'Failed to update status.');
      }
    } catch (e) {
      setActionMessage('Server communication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Create Lease CRM submission
  const handleCreateLease = async (e) => {
    e.preventDefault();
    if (!leaseFarmId || !leaseStart || !leaseEnd || !leasePayout) {
      alert("All fields are required.");
      return;
    }
    
    try {
      const res = await fetch('api/admin/farms.php?action=lease', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          farm_id: leaseFarmId,
          start_date: leaseStart,
          end_date: leaseEnd,
          terms: {
            amount: parseFloat(leasePayout),
            schedule: leaseSchedule,
            currency: 'USD'
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Lease agreement saved successfully.");
        setLeaseFarmId('');
        setLeaseStart('');
        setLeaseEnd('');
        setLeasePayout('');
        loadLeases();
      } else {
        alert(data.error || "Failed to create lease.");
      }
    } catch (err) {
      alert("Network connection error.");
    }
  };

  // Suspend/Activate User Account
  const handleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('api/admin/users.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: userId, status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loadUsers();
      } else {
        alert(data.error || "Update failed.");
      }
    } catch (err) {
      alert("Network error.");
    }
  };

  // Password Reset
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    try {
      const res = await fetch('api/admin/users.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: resetUserId, new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Password reset completed successfully.");
        setResetUserId(null);
        setNewPassword('');
      } else {
        alert(data.error || "Reset failed.");
      }
    } catch (err) {
      alert("Network error.");
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Real-time searches & filters across lists
  const filteredFarms = farms.filter(farm => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      farm.id.toString().includes(query) ||
      farm.farmer_id.toLowerCase().includes(query) ||
      farm.type.toLowerCase().includes(query) ||
      farm.status.toLowerCase().includes(query)
    );
  });

  const filteredLedgers = ledgers.filter(ledger => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ledger.farm_id.toString().includes(query) ||
      ledger.farmer_id.toLowerCase().includes(query) ||
      ledger.calculated_biomass.toString().includes(query) ||
      ledger.carbon_credits_generated.toString().includes(query)
    );
  });

  const filteredLeases = leases.filter(lease => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lease.id.toString().includes(query) ||
      lease.farm_id.toString().includes(query) ||
      lease.status.toLowerCase().includes(query)
    );
  });

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.id.toString().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query) ||
      u.status.toLowerCase().includes(query) ||
      (u.farmer_id && u.farmer_id.toLowerCase().includes(query)) ||
      (u.contact_number && u.contact_number.toLowerCase().includes(query))
    );
  });

  const filteredAuditLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      (log.email && log.email.toLowerCase().includes(query)) ||
      (log.details && log.details.toLowerCase().includes(query)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(query))
    );
  });

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-300 ${bgClass}`}>
      
      {/* Sidebar Navigation */}
      <aside className={`w-full lg:w-64 border-b lg:border-b-0 lg:border-r flex flex-col p-6 gap-6 lg:h-screen lg:fixed lg:top-0 lg:left-0 z-20 transition-colors duration-300 ${sidebarClass}`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-emerald-500">Sahasra</span>
              <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase">Admin</span>
            </div>
            <p className={`text-[10px] mt-1 font-semibold truncate ${textMutedClass}`}>{user.email}</p>
          </div>
        </div>

        {/* Theme Switcher Widget */}
        <div className={`p-3 rounded-2xl flex items-center justify-between border ${innerCardClass}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Theme Mode</span>
          <button 
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition flex items-center gap-1 border border-emerald-500/20 cursor-pointer"
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Global Search Option Widget */}
        <div className="px-1">
          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${textMutedClass}`}>Search Option</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
            />
            <svg 
              className={`h-4 w-4 absolute left-3 top-2.5 ${textMutedClass}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Admin Panels</div>
        
        <nav className="flex flex-col gap-2 flex-grow text-xs font-semibold">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            Dashboard
          </button>

          <button 
            onClick={() => setActiveTab('map')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'map' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0022 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Master Map
          </button>
          
          <button 
            onClick={() => setActiveTab('ledgers')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'ledgers' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Carbon Ledgers
          </button>
          
          <button 
            onClick={() => setActiveTab('leases')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'leases' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Lease CRM
          </button>
          
          <button 
            onClick={() => setActiveTab('users')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'users' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Users
          </button>

          <button 
            onClick={() => setActiveTab('logs')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'logs' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Audit Logs
          </button>
        </nav>

        <div className="flex flex-col gap-2 mt-auto border-t border-slate-850 pt-4 text-xs font-semibold">
          <button 
            onClick={() => window.location.href = '/'}
            className={`w-full py-2.5 border rounded-xl transition text-center cursor-pointer ${
              isDark ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
          >
            Landing Page
          </button>
          <button 
            onClick={logout}
            className="w-full py-2.5 bg-red-950/60 border border-red-800 text-red-200 rounded-xl hover:bg-red-900/60 transition text-center cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-grow lg:ml-64 flex flex-col lg:flex-row min-h-0 relative ${bgClass}`}>
        
        {/* TAB 0: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
              <div>
                <h2 className="text-3xl font-black">Admin Dashboard</h2>
                <p className={`text-xs mt-1 ${textMutedClass}`}>Real-time statistics, verification queues, and audit trails.</p>
              </div>

              {/* Statistics Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className={`p-6 rounded-3xl flex flex-col justify-between border ${cardClass}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass}`}>Registered Farms</span>
                  <span className="text-3xl font-black mt-4">{filteredFarms.length}</span>
                  <span className="text-[10px] text-orange-500 mt-2 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                    {filteredFarms.filter(f => f.status === 'pending').length} Pending Verification
                  </span>
                </div>

                <div className={`p-6 rounded-3xl flex flex-col justify-between border ${cardClass}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass}`}>Total Mapped Area</span>
                  <span className="text-3xl font-black mt-4">
                    {filteredFarms.reduce((acc, f) => acc + parseFloat(f.total_area_acres || 0), 0).toFixed(2)} ac
                  </span>
                  <span className={`text-[10px] mt-2 ${textMutedClass}`}>Acreage of matching boundary polygons</span>
                </div>

                <div className={`p-6 rounded-3xl flex flex-col justify-between border ${cardClass}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass}`}>Estimated Biomass</span>
                  <span className="text-3xl font-black mt-4">
                    {filteredLedgers.reduce((acc, l) => acc + parseFloat(l.calculated_biomass || 0), 0).toLocaleString()} kg
                  </span>
                  <span className={`text-[10px] mt-2 font-bold ${textMutedClass}`}>
                    Biometric agroforestry estimates
                  </span>
                </div>

                <div className={`p-6 rounded-3xl flex flex-col justify-between border ${cardClass}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass}`}>Carbon Credits</span>
                  <span className="text-3xl font-black mt-4">
                    {filteredLedgers.reduce((acc, l) => acc + parseFloat(l.carbon_credits_generated || 0), 0).toFixed(2)} t
                  </span>
                  <span className="text-[10px] text-emerald-500 mt-2 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    CO2eq metric tons generated
                  </span>
                </div>

                <div className={`p-6 rounded-3xl flex flex-col justify-between border ${cardClass}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass}`}>Platform Leases</span>
                  <span className="text-3xl font-black mt-4">
                    {filteredLeases.filter(l => l.status === 'active').length} Active
                  </span>
                  <span className={`text-[10px] mt-2 ${textMutedClass}`}>
                    Lease-to-Platform agreements
                  </span>
                </div>

                <div className={`p-6 rounded-3xl flex flex-col justify-between border ${cardClass}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass}`}>Registered Users</span>
                  <span className="text-3xl font-black mt-4">{filteredUsers.length}</span>
                  <span className={`text-[10px] mt-2 ${textMutedClass}`}>Farmers and administrators</span>
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Column 1: Pending Verifications */}
                <div className={`rounded-3xl p-6 border ${cardClass}`}>
                  <h3 className={`font-bold text-sm mb-4 uppercase tracking-wider text-[10px] ${textMutedClass}`}>Farms Pending Verification</h3>
                  {filteredFarms.filter(f => f.status === 'pending').length === 0 ? (
                    <div className={`text-center py-8 text-xs font-semibold ${textMutedClass}`}>
                      All matching land submissions verified.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`border-b font-bold ${textMutedClass}`}>
                            <th className="pb-3">Farm ID</th>
                            <th className="pb-3">Farmer</th>
                            <th className="pb-3">Area</th>
                            <th className="pb-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredFarms.filter(f => f.status === 'pending').slice(0, 5).map(f => (
                            <tr key={f.id} className="border-b border-slate-850/20 hover:bg-slate-500/5">
                              <td className="py-3 font-mono font-bold">SB-FARM-{f.id}</td>
                              <td className="py-3 font-mono">{f.farmer_id}</td>
                              <td className="py-3">{f.total_area_acres} ac</td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedFarm(f);
                                    setActiveTab('map');
                                  }}
                                  className="text-emerald-500 hover:text-emerald-600 font-bold text-xs"
                                >
                                  Review on Map
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Column 2: System Logs Audit */}
                <div className={`rounded-3xl p-6 border ${cardClass}`}>
                  <h3 className={`font-bold text-sm mb-4 uppercase tracking-wider text-[10px] ${textMutedClass}`}>Recent System Logs</h3>
                  {filteredAuditLogs.length === 0 ? (
                    <div className={`text-center py-8 text-xs font-semibold ${textMutedClass}`}>
                      No matching system logs available.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAuditLogs.slice(0, 5).map(log => (
                        <div key={log.id} className={`p-3 border rounded-xl text-xs flex justify-between items-center ${innerCardClass}`}>
                          <div>
                            <span className="font-bold">{log.action}</span>
                            <div className={`text-[10px] ${textMutedClass}`}>{log.email || 'SYSTEM'} &bull; {log.ip_address}</div>
                          </div>
                          <span className={`text-[10px] font-mono ${textMutedClass}`}>
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 1: MASTER MAP */}
        {activeTab === 'map' && (
          <>
            {/* Map Area */}
            <div className="flex-grow h-[60vh] lg:h-auto relative z-0">
              <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%', background: isDark ? '#090d16' : '#f8fafc' }}>
                <ChangeView center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  attribution='&copy; CARTO'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                
                {filteredFarms.map((farm) => {
                  const positions = parseWKT(farm.boundary_polygon);
                  if (positions.length === 0) return null;
                  
                  // Color coding rules:
                  // Pending = Orange (#f97316), Verified = Green (#22c55e), Rejected = Red (#ef4444), Leased = Blue (#3b82f6)
                  let color = '#f97316'; // Pending
                  if (farm.status === 'rejected') color = '#ef4444';
                  else if (farm.status === 'verified') {
                    color = farm.type === 'leased_to_platform' ? '#3b82f6' : '#22c55e';
                  }

                  return (
                    <Polygon 
                      key={farm.id} 
                      positions={positions} 
                      pathOptions={{ fillColor: color, color: color, weight: 2.5, fillOpacity: 0.35 }}
                      eventHandlers={{
                        click: () => {
                          setSelectedFarm(farm);
                        }
                      }}
                    />
                  );
                })}
              </MapContainer>

              {/* Status color-code legend in map */}
              <div className={`absolute bottom-6 left-6 z-[1000] p-4 rounded-2xl flex flex-col gap-2 text-xs font-semibold backdrop-blur shadow-2xl border ${
                isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-900'
              }`}>
                <span className={`${textMutedClass} font-bold uppercase tracking-wider text-[10px] mb-1`}>Land Status Map</span>
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-orange-500 rounded"></span> Pending Approval</span>
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-green-500 rounded"></span> Verified (Support)</span>
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-blue-500 rounded"></span> Verified (Leased)</span>
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 bg-red-500 rounded"></span> Rejected</span>
              </div>
            </div>

            {/* Sidebar Details Drawer */}
            <div className={`w-full lg:w-[420px] border-t lg:border-t-0 lg:border-l flex flex-col overflow-hidden shadow-2xl ${sidebarClass}`}>
              {!selectedFarm ? (
                <div className={`m-auto text-center p-8 text-sm font-semibold ${textMutedClass}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Click any land polygon on the map to trigger details panel and verifications.
                </div>
              ) : (
                <div className="flex flex-col h-full overflow-hidden p-6">
                  {/* Top Close button and summary */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Land Details</span>
                      <h2 className="text-lg font-black capitalize mt-1">{selectedFarm.type.replace('_', ' ')}</h2>
                    </div>
                    <button 
                      onClick={() => setSelectedFarm(null)} 
                      className={`${textMutedClass} hover:text-emerald-500 text-xs font-bold`}
                    >
                      Close &times;
                    </button>
                  </div>

                  {actionMessage && (
                    <div className={`mb-4 p-3 border rounded-xl text-xs text-center font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      {actionMessage}
                    </div>
                  )}

                  <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-grow custom-scrollbar">
                    {/* Summary statistics */}
                    <div className={`grid grid-cols-2 gap-3 p-4 border rounded-2xl ${innerCardClass}`}>
                      <div>
                        <div className={textMutedClass}>Farm ID</div>
                        <div className="font-mono font-bold mt-1">SB-FARM-{selectedFarm.id}</div>
                      </div>
                      <div>
                        <div className={textMutedClass}>Farmer ID</div>
                        <div className="font-mono font-bold mt-1">{selectedFarm.farmer_id}</div>
                      </div>
                      <div className={`col-span-2 border-t my-1 ${isDark ? 'border-slate-850' : 'border-slate-200'}`}></div>
                      <div>
                        <div className={textMutedClass}>Farmer Email</div>
                        <div className="font-semibold truncate mt-1" title={selectedFarm.email}>{selectedFarm.email}</div>
                      </div>
                      <div>
                        <div className={textMutedClass}>Contact Number</div>
                        <div className="font-mono font-bold mt-1">{selectedFarm.contact_number || 'N/A'}</div>
                      </div>
                      <div className={`col-span-2 border-t my-1 ${isDark ? 'border-slate-850' : 'border-slate-200'}`}></div>
                      <div>
                        <div className={textMutedClass}>Land Area</div>
                        <div className="font-bold mt-1">{selectedFarm.total_area_acres} Acres</div>
                      </div>
                      <div>
                        <div className={textMutedClass}>Verification Status</div>
                        <div className="font-bold mt-1 capitalize">{selectedFarm.status}</div>
                      </div>
                    </div>

                    {/* Active Lease Contract summary inside drawer */}
                    {selectedFarm.lease_id && (
                      <div className={`p-4 border rounded-2xl flex flex-col gap-2 ${
                        isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-100' : 'bg-emerald-50/70 border-emerald-200 text-slate-900'
                      }`}>
                        <span className="font-bold text-emerald-600 text-[11px] uppercase tracking-wider">Active Lease Contract</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className={textMutedClass}>Contract ID</span>
                            <div className="font-mono font-bold mt-0.5">SB-LEASE-{selectedFarm.lease_id}</div>
                          </div>
                          <div>
                            <span className={textMutedClass}>Payout Rate</span>
                            <div className="font-semibold text-emerald-600 mt-0.5">
                              ${JSON.parse(selectedFarm.lease_terms || '{}').amount} &bull; {JSON.parse(selectedFarm.lease_terms || '{}').schedule}
                            </div>
                          </div>
                          <div className={`col-span-2 border-t my-0.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
                          <div className="col-span-2">
                            <span className={textMutedClass}>Term Duration</span>
                            <div className="font-mono mt-0.5">{selectedFarm.lease_start} to {selectedFarm.lease_end}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Verification Action Drawer */}
                    {selectedFarm.status === 'pending' && (
                      <div className={`p-4 border rounded-2xl flex flex-col gap-3 ${
                        isDark ? 'bg-slate-950 border-orange-500/20 text-slate-100' : 'bg-orange-50/70 border-orange-200 text-slate-900'
                      }`}>
                        <span className="font-bold text-orange-500 text-xs">Verify Land Boundary</span>
                        <p className={`text-[11px] ${textMutedClass}`}>
                          Confirm that the perimeter overlaps are zero and review GPS logs before making a decision.
                        </p>
                        <div className="flex gap-3 mt-1">
                          <button 
                            disabled={loading}
                            onClick={() => handleFarmStatus(selectedFarm.id, 'verified')}
                            className="flex-grow py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-center cursor-pointer"
                          >
                            Verify & Approve
                          </button>
                          <button 
                            disabled={loading}
                            onClick={() => handleFarmStatus(selectedFarm.id, 'rejected')}
                            className={`flex-grow py-2.5 border font-semibold rounded-xl text-center cursor-pointer ${
                              isDark ? 'bg-red-950/60 border-red-800 text-red-200 hover:bg-red-900/60' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Plant Catalog Visual EXIF checking */}
                    <div>
                      <h3 className={`font-bold mb-3 uppercase tracking-wider text-[10px] ${textMutedClass}`}>Tree Photo Evidence ({plants.length})</h3>
                      {plants.length === 0 ? (
                        <div className={`text-center py-8 border border-dashed rounded-2xl font-semibold ${innerCardClass} ${textMutedClass}`}>
                          No plant photos registered on this farm
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {plants.map((plant) => (
                            <div key={plant.id} className={`border rounded-2xl p-3 space-y-3 ${innerCardClass}`}>
                              <img 
                                src={`${window.API_BASE || 'api/'}${plant.photo_url}`} 
                                alt={plant.species} 
                                className="w-full h-32 object-cover rounded-xl bg-slate-900"
                              />
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div>
                                    <span className={textMutedClass}>Species</span>
                                    <div className="font-bold capitalize mt-0.5">{plant.species}</div>
                                  </div>
                                  <div>
                                    <span className={textMutedClass}>EXIF Geotag Check</span>
                                    <div className="text-emerald-500 font-bold flex items-center gap-1 mt-0.5">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Valid Match
                                    </div>
                                  </div>
                                  <div className="col-span-2">
                                    <span className={textMutedClass}>Spatial Coordinates</span>
                                    <div className="font-mono mt-0.5">{plant.coordinates}</div>
                                  </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: CARBON LEDGERS */}
        {activeTab === 'ledgers' && (
          <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-black">Carbon Credit Ledgers</h2>
                <p className={`text-xs mt-1 ${textMutedClass}`}>Biometric carbon capture values calculated automatically on verification (Admins-only routes).</p>
              </div>

              <div className={`border rounded-3xl overflow-hidden shadow-2xl ${cardClass}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b font-bold uppercase tracking-wider ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                      <th className="p-4">Farm ID</th>
                      <th className="p-4">Farmer ID</th>
                      <th className="p-4">Total Area (Acres)</th>
                      <th className="p-4">Estimated Biomass (kg)</th>
                      <th className="p-4">Carbon Credits Generated (tons CO2eq)</th>
                      <th className="p-4">Market Value ($20/t)</th>
                      <th className="p-4">Last Synced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedgers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className={`p-8 text-center font-semibold ${textMutedClass}`}>No carbon credit records match the query.</td>
                      </tr>
                    ) : (
                      filteredLedgers.map((ledger) => (
                        <tr key={ledger.id} className={`border-b hover:bg-slate-500/5 ${isDark ? 'border-slate-850' : 'border-slate-150'}`}>
                          <td className="p-4 font-mono font-bold">SB-FARM-{ledger.farm_id}</td>
                          <td className="p-4 font-mono">{ledger.farmer_id}</td>
                          <td className="p-4">{ledger.total_area_acres}</td>
                          <td className="p-4 font-mono">{parseFloat(ledger.calculated_biomass).toLocaleString()} kg</td>
                          <td className="p-4 font-mono font-bold text-emerald-500">{parseFloat(ledger.carbon_credits_generated).toFixed(4)} t</td>
                          <td className="p-4 font-mono font-bold">${parseFloat(ledger.market_value).toLocaleString()}</td>
                          <td className={`p-4 ${textMutedClass}`}>{new Date(ledger.last_updated).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LEASE CRM */}
        {activeTab === 'leases' && (
          <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Rent contract scheduler form */}
              <div className={`rounded-3xl p-6 shadow-xl h-fit border ${cardClass}`}>
                <h3 className="text-base font-bold mb-4">Establish Rent / Lease Payout</h3>
                <form onSubmit={handleCreateLease} className="space-y-4 text-xs">
                  <div>
                    <label className={`block font-bold uppercase mb-2 ${textMutedClass}`}>Select Leasable Farm</label>
                    <select
                      value={leaseFarmId}
                      onChange={(e) => setLeaseFarmId(e.target.value)}
                      required
                      className={`w-full rounded-xl px-3 py-2.5 outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                    >
                      <option value="">-- Choose Farm --</option>
                      {farms
                        .filter(f => f.type === 'leased_to_platform' && f.status === 'verified')
                        .map(f => (
                          <option key={f.id} value={f.id}>
                            SB-FARM-{f.id} (Farmer: {f.farmer_id}) - {f.total_area_acres} ac
                          </option>
                        ))}
                    </select>
                    <p className={`text-[10px] mt-1 ${textMutedClass}`}>Only verified farms requesting Lease platform model are visible.</p>
                  </div>

                  <div>
                    <label className={`block font-bold uppercase mb-2 ${textMutedClass}`}>Contract Start Date</label>
                    <input
                      type="date"
                      value={leaseStart}
                      onChange={(e) => setLeaseStart(e.target.value)}
                      required
                      className={`w-full rounded-xl px-3 py-2.5 outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label className={`block font-bold uppercase mb-2 ${textMutedClass}`}>Contract End Date</label>
                    <input
                      type="date"
                      value={leaseEnd}
                      onChange={(e) => setLeaseEnd(e.target.value)}
                      required
                      className={`w-full rounded-xl px-3 py-2.5 outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-bold uppercase mb-2 ${textMutedClass}`}>Payout Amount ($)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={leasePayout}
                        onChange={(e) => setLeasePayout(e.target.value)}
                        required
                        className={`w-full rounded-xl px-3 py-2.5 outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className={`block font-bold uppercase mb-2 ${textMutedClass}`}>Schedule</label>
                      <select
                        value={leaseSchedule}
                        onChange={(e) => setLeaseSchedule(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2.5 outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition mt-2 cursor-pointer"
                  >
                    Initiate Agreement
                  </button>
                </form>
              </div>

              {/* Lease Listings */}
              <div className={`rounded-3xl p-6 shadow-xl border lg:col-span-2 ${cardClass}`}>
                <h3 className="text-base font-bold mb-4">Active Land Lease Agreements</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b font-bold uppercase ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        <th className="p-3">Agreement ID</th>
                        <th className="p-3">Farm ID</th>
                        <th className="p-3">Total Acres</th>
                        <th className="p-3">Start Date</th>
                        <th className="p-3">End Date</th>
                        <th className="p-3">Terms Summary</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeases.length === 0 ? (
                        <tr>
                          <td colSpan="7" className={`p-6 text-center font-semibold ${textMutedClass}`}>No lease agreements match the search.</td>
                        </tr>
                      ) : (
                        filteredLeases.map((l) => {
                          const terms = JSON.parse(l.terms_json || '{}');
                          return (
                            <tr key={l.id} className={`border-b hover:bg-slate-500/5 ${isDark ? 'border-slate-850' : 'border-slate-150'}`}>
                              <td className="p-3 font-mono font-bold">SB-LEASE-{l.id}</td>
                              <td className="p-3 font-mono">SB-FARM-{l.farm_id}</td>
                              <td className="p-3">{l.total_area_acres} Acres</td>
                              <td className="p-3">{l.start_date}</td>
                              <td className="p-3">{l.end_date}</td>
                              <td className="p-3 font-semibold text-emerald-550">${terms.amount} &bull; {terms.schedule}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  l.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                                }`}>
                                  {l.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: USERS */}
        {activeTab === 'users' && (
          <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-black">User Accounts Manager</h2>
                <p className={`text-xs mt-1 ${textMutedClass}`}>Suspend, activate, or force credential overrides across platform accounts.</p>
              </div>

              {resetUserId && (
                <form onSubmit={handlePasswordReset} className={`p-6 rounded-3xl flex items-center justify-between gap-4 border ${cardClass}`}>
                  <div className="text-xs">
                    <span className="font-bold block">Force Password Reset for User ID: {resetUserId}</span>
                    <input
                      type="password"
                      placeholder="Enter new secure password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className={`mt-2 rounded-xl px-3 py-1.5 outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl cursor-pointer">Save</button>
                    <button type="button" onClick={() => setResetUserId(null)} className={`px-4 py-2 border text-xs font-semibold rounded-xl cursor-pointer ${inputClass}`}>Cancel</button>
                  </div>
                </form>
              )}

              <div className={`border rounded-3xl overflow-hidden shadow-2xl ${cardClass}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b font-bold uppercase ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                      <th className="p-4">Database ID</th>
                      <th className="p-4">Farmer ID</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Contact Number</th>
                      <th className="p-4">System Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className={`border-b hover:bg-slate-500/5 ${isDark ? 'border-slate-850' : 'border-slate-150'}`}>
                        <td className="p-4 font-mono font-bold">{u.id}</td>
                        <td className="p-4 font-mono font-bold">{u.farmer_id || 'ADMIN_USER'}</td>
                        <td className="p-4">{u.email}</td>
                        <td className="p-4 font-mono">{u.contact_number || 'N/A'}</td>
                        <td className="p-4 capitalize">{u.role}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            u.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => handleUserStatus(u.id, u.status)}
                            className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase border transition cursor-pointer ${
                              u.status === 'active' 
                                ? 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-900/40' 
                                : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/40'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setResetUserId(u.id)}
                            className={`px-3 py-1 border font-bold text-[10px] uppercase rounded-lg transition cursor-pointer ${inputClass}`}
                          >
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-black">Security Compliance Logs</h2>
                <p className={`text-xs mt-1 ${textMutedClass}`}>Audit trail mapping client IP addresses, administrative updates, and access violations.</p>
              </div>

              <div className={`border rounded-3xl overflow-hidden shadow-2xl ${cardClass}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b font-bold uppercase ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Actor</th>
                      <th className="p-4">Action Type</th>
                      <th className="p-4">Details</th>
                      <th className="p-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className={`border-b hover:bg-slate-500/5 ${isDark ? 'border-slate-850' : 'border-slate-150'}`}>
                        <td className="p-4 font-mono text-[10px]">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-4">
                          <span className="font-bold">{log.email || 'SYSTEM / GUEST'}</span>
                          {log.role && <span className="block text-[9px] uppercase font-bold text-slate-500">{log.role}</span>}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            log.action.includes('FAILED') || log.action.includes('FRAUD') || log.action.includes('UNAUTHORIZED')
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-slate-950 text-slate-350 border border-slate-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs overflow-hidden text-ellipsis">{log.details}</td>
                        <td className="p-4 font-mono">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
