import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Marker, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
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

function MapEventsHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
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
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null); // { table, id, data: {...} }
  
  const [products, setProducts] = useState([]);
  const [bulkOrders, setBulkOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', locality: '', image_url: '', stock_quantity: 0, unit: 'kg' });
  const [imageInputType, setImageInputType] = useState('url'); // 'url' or 'upload'
  const [imageFile, setImageFile] = useState(null);
  
  // Add Rental Farm states
  const [newRentalFarm, setNewRentalFarm] = useState({
    name: '', farming_type: 'organic', total_area_acres: '', 
    soil_type: '', water_source: '', irrigation_system: 'none', 
    crop_insurance: 'no', lease_years: '5'
  });
  const [newRentalCoordinates, setNewRentalCoordinates] = useState([]);
  
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
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Dark/Light Theme state (defaults to light as requested)
  const [theme, setTheme] = useState(localStorage.getItem('sb_theme') || 'light');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('sb_theme', nextTheme);
  };

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-[#060a07] text-slate-100' : 'bg-slate-50 text-slate-900';
  const sidebarClass = isDark ? 'sidebar-glass text-slate-100' : 'sidebar-glass-light text-slate-900';
  const cardClass = isDark ? 'glass-card card-hover-effect' : 'glass-card-light card-hover-effect-light';
  const inputClass = isDark ? 'bg-[#111e16] border-emerald-500/10 text-slate-200 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30' : 'bg-slate-100 border-slate-200 text-slate-800 focus:border-emerald-600';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const innerCardClass = isDark ? 'bg-[#111e16] border border-emerald-500/10' : 'bg-slate-100 border border-slate-200';
  // Initial loads
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let { table, id, data } = editingEntity;
      let finalData = { ...data };

      if (imageInputType === 'upload' && imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await fetch('api/admin/upload.php', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success) {
          finalData.image_url = uploadData.url;
        } else {
          alert(uploadData.error || "Failed to upload image.");
          setLoading(false);
          return;
        }
      }

      const res = await fetch('api/admin/update_entity.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ table, id, updates: finalData })
      });
      const responseData = await res.json();
      if (res.ok) {
        alert('Entity successfully updated!');
        setActionMessage('Entity successfully updated!');
        setEditingEntity(null);
        // Reload all data to reflect changes
        loadFarms();
        loadLedgers();
        loadLeases();
        loadUsers();
        loadProducts();
        loadBulkOrders();
        loadOrders();
        if (selectedFarm) {
          loadPlants(selectedFarm.id);
        }
      } else {
        const errorMsg = responseData.error || 'Update failed';
        alert(errorMsg);
        setActionMessage(errorMsg);
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
      setActionMessage('Network error');
    } finally {
      setLoading(false);
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const makeRentable = async (farmId, leaseYears) => {
    if (!leaseYears || isNaN(leaseYears) || parseInt(leaseYears) < 1) {
      alert("Please specify a valid lease term in years.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('api/admin/update_entity.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'farms',
          id: farmId,
          updates: {
            is_rentable: 1,
            lease_years: parseInt(leaseYears)
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Farm is now available for rent!');
        loadFarms(); // reload to reflect changes
      } else {
        alert(data.error || 'Failed to make rentable');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };
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

  const loadProducts = async () => {
    try {
      const res = await fetch('api/products.php');
      const data = await res.json();
      if (res.ok && data.success) setProducts(data.products || []);
    } catch (e) { console.error(e); }
  };

  const loadBulkOrders = async () => {
    try {
      const res = await fetch('api/bulk_orders.php');
      const data = await res.json();
      if (res.ok && data.success) setBulkOrders(data.bulk_orders || []);
    } catch (e) { console.error(e); }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch('api/admin/orders.php', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) setOrders(data.orders || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadFarms();
      loadLedgers();
      loadLeases();
      loadUsers();
    }
    if (activeTab === 'ledgers') loadLedgers();
    if (activeTab === 'leases') {
      loadLeases();
      loadFarms();
    }
    if (activeTab === 'users') {
      loadUsers();
      loadOrders();
    }
    if (activeTab === 'products') loadProducts();
    if (activeTab === 'bulk_orders') loadBulkOrders();
    if (activeTab === 'orders') loadOrders();
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

  // Approve or Reject Plant (Tree) Registration
  const handlePlantStatus = async (plantId, newStatus) => {
    setLoading(true);
    setActionMessage('');
    try {
      const res = await fetch('api/admin/farms.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'plant_status', plant_id: plantId, status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Tree successfully ${newStatus === 'approved' ? 'Approved' : 'Rejected'}.`);
        if (selectedFarm) {
          loadPlants(selectedFarm.id);
          loadLedgers();
        }
      } else {
        setActionMessage(data.error || 'Failed to update tree status.');
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
    if (!leaseFarmId || !leaseStart || !leaseEnd) {
      alert("All fields are required.");
      return;
    }
    
    const start = new Date(leaseStart);
    const end = new Date(leaseEnd);
    if (end <= start) {
      alert("Lease End Date must be after Lease Start Date.");
      return;
    }
    
    const amount = parseFloat(leasePayout);
    if (isNaN(amount) || amount <= 0) {
      alert("Payout amount must be a positive number.");
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
            amount: parseFloat(leasePayout) || 0,
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

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = newProduct.image_url;

      if (imageInputType === 'upload' && imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await fetch('api/admin/upload.php', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success) {
          finalImageUrl = uploadData.url;
        } else {
          alert(uploadData.error || "Failed to upload image.");
          setLoading(false);
          return;
        }
      }

      const productToSave = { ...newProduct, image_url: finalImageUrl };

      const res = await fetch('api/admin/products.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productToSave)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Product added successfully!");
        setShowAddProduct(false);
        setNewProduct({ name: '', description: '', price: '', locality: '', image_url: '' });
        setImageFile(null);
        loadProducts();
      } else {
        alert(data.error || "Failed to add product.");
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const removeFromRent = async (farmId) => {
    if (!window.confirm("Are you sure you want to remove this farm from being rentable?")) return;
    setLoading(true);
    try {
      const res = await fetch('api/admin/update_entity.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: 'farms',
          id: farmId,
          updates: {
            is_rentable: 0,
            lease_years: null
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Farm removed from rent!');
        loadFarms();
      } else {
        alert(data.error || 'Failed to remove from rent');
      }
    } catch (err) {
      alert('Network error while removing from rent');
    } finally {
      setLoading(false);
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
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
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

  const standardOrders = React.useMemo(() => {
    return orders.filter(o => {
      if (o.order_group_id || parseInt(o.quantity) >= 15) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.id.toString() === q ||
        (o.farmer_ref && o.farmer_ref.toLowerCase().includes(q)) ||
        (o.farmer_id && o.farmer_id.toString() === q) ||
        (o.item_name && o.item_name.toLowerCase().includes(q)) ||
        (o.farmer_email && o.farmer_email.toLowerCase().includes(q))
      );
    });
  }, [orders, searchQuery]);

  const bulkPurchaseOrders = React.useMemo(() => {
    const groups = {};
    const result = [];
    
    // First, add all single items with quantity >= 15
    orders.filter(o => !o.order_group_id && parseInt(o.quantity) >= 15).forEach(o => {
      result.push(o);
    });

    // Then group all the cart orders
    orders.filter(o => o.order_group_id).forEach(o => {
      if (!groups[o.order_group_id]) {
        groups[o.order_group_id] = {
          ...o,
          isGroup: true,
          item_name: 'Multiple Products (Cart)',
          item_type: 'bulk',
          quantity: parseInt(o.quantity),
          grouped_items: [o]
        };
        result.push(groups[o.order_group_id]);
      } else {
        groups[o.order_group_id].quantity += parseInt(o.quantity);
        groups[o.order_group_id].grouped_items.push(o);
      }
    });
    
    let finalResult = result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      finalResult = finalResult.filter(o => 
        o.id.toString() === q ||
        (o.order_group_id && o.order_group_id.toLowerCase().includes(q)) ||
        (o.farmer_ref && o.farmer_ref.toLowerCase().includes(q)) ||
        (o.farmer_id && o.farmer_id.toString() === q) ||
        (o.farmer_email && o.farmer_email.toLowerCase().includes(q)) ||
        (o.item_name && o.item_name.toLowerCase().includes(q))
      );
    }
    return finalResult;
  }, [orders, searchQuery]);

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-300 ${bgClass}`}>
      
      {/* Mobile Top Header */}
      <header className={`lg:hidden flex justify-between items-center p-4 border-b fixed top-0 w-full z-40 transition-colors duration-300 ${sidebarClass}`}>
        <div className="flex items-center gap-3">
          <img src="Logo-SF.webp" alt="Sahasra Bharat" className="h-8 w-auto object-contain" />
          <span className="text-xl font-extrabold text-emerald-600">Sahasra</span>
          <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold transition flex items-center justify-center">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={logout} className="p-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className={`lg:hidden fixed bottom-0 left-0 w-full border-t flex justify-around items-center px-1 py-3 z-40 transition-colors duration-300 ${sidebarClass}`}>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('dashboard')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'dashboard' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>
          <span className="text-[9px]">Home</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('map')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'map' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0022 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          <span className="text-[9px]">Map</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('ledgers')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'ledgers' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
          <span className="text-[9px]">Ledgers</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('leases')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'leases' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-[9px]">Leases</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('users')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'users' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <span className="text-[9px]">Users</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('products')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'products' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <span className="text-[9px]">Products</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('orders')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'orders' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <span className="text-[9px]">Orders</span>
        </button>
      </nav>

      {/* Sidebar Navigation */}
      <aside className={`hidden lg:flex lg:w-64 border-r flex-col p-6 gap-6 lg:h-screen lg:fixed lg:top-0 lg:left-0 z-20 transition-colors duration-300 ${sidebarClass}`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <img src="Logo-SF.webp" alt="Sahasra Bharat" className="h-10 w-auto object-contain" />
              <span className="text-xl font-extrabold text-emerald-600">Sahasra</span>
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
        
        <nav className="flex flex-col gap-2 flex-grow text-xs font-semibold overflow-y-auto min-h-0 pr-1 pb-2">
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
            onClick={() => setActiveTab('add_rental_farm')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'add_rental_farm' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Rental Farm
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


          <div className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${textMutedClass}`}>Store</div>

          <button 
            onClick={() => setActiveTab('products')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'products' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Products
          </button>

          <button 
            onClick={() => setActiveTab('bulk_purchases')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'bulk_purchases' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Bulk Purchases
          </button>

          <button 
            onClick={() => setActiveTab('orders')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
              activeTab === 'orders' 
                ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' 
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100')
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Orders CRM
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
      <main className={`flex-grow lg:ml-64 flex flex-col lg:flex-row min-h-0 relative pt-20 pb-24 lg:pt-0 lg:pb-0 ${bgClass}`}>
        
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

              {/* Pending Verifications */}
              <div className="w-full">
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
                            <tr 
                              key={f.id} 
                              className="border-b border-slate-850/20 hover:bg-emerald-500/10 cursor-pointer transition-colors"
                              onClick={() => {
                                setSelectedFarm(f);
                                setActiveTab('map');
                              }}
                            >
                              <td className="py-3 font-mono font-bold">SB-FARM-{f.id}</td>
                              <td className="py-3 font-mono">{f.farmer_id}</td>
                              <td className="py-3">{f.total_area_acres} ac</td>
                              <td className="py-3 text-right flex items-center justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const { id, boundary_polygon, geom, ...rest } = f;
                                    setEditingEntity({ table: 'farms', id: f.id, data: rest });
                                  }}
                                  className="text-orange-500 hover:text-orange-600 font-bold text-[10px] uppercase tracking-wider"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
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
              </div>

            </div>
          </div>
        )}

        {/* TAB 1: MASTER MAP */}
        {activeTab === 'map' && (
          <div className="flex flex-col lg:flex-row w-full lg:h-[calc(100vh-80px)] overflow-y-auto lg:overflow-hidden">
            {/* Map Area */}
            <div className="flex-none lg:flex-grow h-[50vh] lg:h-full relative z-0">
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
                
                {/* Render selected farm plants as markers */}
                {activeTab === 'map' && plants && plants.map((plant) => {
                  if (plant.gps_lat && plant.gps_lng) {
                    return (
                      <Marker key={`plant-${plant.id}`} position={[parseFloat(plant.gps_lat), parseFloat(plant.gps_lng)]}>
                        <Popup>
                          <div className="text-center font-bold">
                            <div>SB-TREE-{plant.id}</div>
                            <div className="capitalize text-emerald-600">{plant.species}</div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }
                  return null;
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
            <div className={`w-full lg:w-[420px] flex-none border-t lg:border-t-0 lg:border-l flex flex-col lg:overflow-hidden shadow-2xl ${sidebarClass}`}>
              {!selectedFarm ? (
                <div className={`m-auto text-center p-8 text-sm font-semibold py-20 ${textMutedClass}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Click any land polygon on the map to trigger details panel and verifications.
                </div>
              ) : (
                <div className="flex flex-col lg:h-full lg:overflow-hidden p-6 pb-32 lg:pb-6">
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

                  {/* Action Status Toast */}
                  {actionMessage && (
                    <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-xl shadow-2xl border border-slate-700 font-semibold text-xs animate-fadeIn z-[100]">
                      {actionMessage}
                    </div>
                  )}

                  <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-grow custom-scrollbar">
                    {/* Summary statistics */}
                    <div className={`grid grid-cols-2 gap-3 p-4 border rounded-2xl ${innerCardClass}`}>
                      <div>
                        <div className={textMutedClass}>Farm Name</div>
                        <div className="font-bold mt-1">{selectedFarm.name || 'Unnamed Farm'}</div>
                      </div>
                      <div>
                        <div className={textMutedClass}>Farming Type</div>
                        <div className="font-bold mt-1 capitalize">{selectedFarm.farming_type || 'Agroforestry'}</div>
                      </div>
                      <div className={`col-span-2 border-t my-1 ${isDark ? 'border-slate-850' : 'border-slate-200'}`}></div>
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
                      <div className={`col-span-2 border-t my-1 ${isDark ? 'border-slate-850' : 'border-slate-200'}`}></div>
                      <div>
                        <div className={textMutedClass}>Soil Type</div>
                        <div className="font-semibold mt-1 capitalize">{selectedFarm.soil_type || 'N/A'}</div>
                      </div>
                      <div>
                        <div className={textMutedClass}>Water Source</div>
                        <div className="font-semibold mt-1 capitalize">{selectedFarm.water_source || 'N/A'}</div>
                      </div>
                      <div className={`col-span-2 border-t my-1 ${isDark ? 'border-slate-850' : 'border-slate-200'}`}></div>
                      <div>
                        <div className={textMutedClass}>Irrigation System</div>
                        <div className="font-semibold mt-1 capitalize">{selectedFarm.irrigation_system || 'N/A'}</div>
                      </div>
                      <div>
                        <div className={textMutedClass}>Crop Insurance</div>
                        <div className="font-semibold mt-1 capitalize">{selectedFarm.crop_insurance || 'no'}</div>
                      </div>
                      <div className={`col-span-2 border-t my-1 ${isDark ? 'border-slate-850' : 'border-slate-200'}`}></div>
                      <div>
                        <div className={textMutedClass}>Preferred Visit Slot</div>
                        <div className="font-semibold mt-1 capitalize">{selectedFarm.visit_slot || 'N/A'}</div>
                      </div>
                      <div>
                        <div className={textMutedClass}>Lease Term</div>
                        <div className="font-semibold mt-1">
                          {selectedFarm.lease_years ? `${selectedFarm.lease_years} Years` : (selectedFarm.type === 'leased_to_platform' ? 'Unlimited Years' : 'N/A')}
                        </div>
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
                    {(selectedFarm.status !== 'verified') && (
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
                          {selectedFarm.status !== 'rejected' && (
                            <button 
                              disabled={loading}
                              onClick={() => handleFarmStatus(selectedFarm.id, 'rejected')}
                              className={`flex-grow py-2.5 border font-semibold rounded-xl text-center cursor-pointer ${
                                isDark ? 'bg-red-950/60 border-red-800 text-red-200 hover:bg-red-900/60' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                              }`}
                            >
                              Reject
                            </button>
                          )}
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
                                src={plant.photo_url} 
                                alt={plant.species} 
                                onClick={() => setSelectedPlant(plant)}
                                className="w-full h-32 object-cover rounded-xl bg-slate-900 cursor-pointer hover:opacity-80 transition-opacity"
                              />
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div>
                                    <div className="flex justify-between items-center">
                                      <span className={textMutedClass}>Tree ID & Species</span>
                                      <button 
                                        onClick={() => {
                                          const { id, boundary_polygon, geom, coordinates, photo_url, ...rest } = plant;
                                          setEditingEntity({ table: 'plants', id: plant.id, data: rest });
                                        }}
                                        className="text-orange-500 hover:text-orange-600 font-bold uppercase tracking-wider text-[9px]"
                                      >
                                        ✏️ Edit
                                      </button>
                                    </div>
                                    <div className="font-bold capitalize mt-0.5">SB-TREE-{plant.id} ({plant.species})</div>
                                  </div>
                                  <div>
                                    <span className={textMutedClass}>EXIF GPS Check</span>
                                    <div className="mt-0.5 font-bold">
                                      {plant.gps_match_status === 'matched' && (
                                        <span className="text-emerald-500 flex items-center gap-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                          </svg>
                                          Matched
                                        </span>
                                      )}
                                      {plant.gps_match_status === 'mismatched' && (
                                        <span className="text-red-500 flex items-center gap-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                          </svg>
                                          Mismatched
                                        </span>
                                      )}
                                      {plant.gps_match_status === 'no_metadata' && (
                                        <span className="text-slate-400">No GPS Metadata</span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <span className={textMutedClass}>Verification Status</span>
                                    <div className="mt-0.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        plant.status === 'approved' ? 'glow-badge-emerald' :
                                        plant.status === 'rejected' ? 'glow-badge-red' : 'glow-badge-amber'
                                      }`}>
                                        {plant.status}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="col-span-2">
                                    <span className={textMutedClass}>Mapped Coordinates</span>
                                    <div className="font-mono mt-0.5">{plant.coordinates}</div>
                                  </div>
                              </div>

                              {plant.status !== 'approved' && (
                                <div className="flex gap-2 pt-2 border-t border-slate-850">
                                  <button
                                    onClick={() => handlePlantStatus(plant.id, 'approved')}
                                    className="flex-grow py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg text-center text-[10px] cursor-pointer"
                                  >
                                    Approve Tree
                                  </button>
                                  {plant.status !== 'rejected' && (
                                    <button
                                      onClick={() => handlePlantStatus(plant.id, 'rejected')}
                                      className="flex-grow py-1 bg-red-950/60 border border-red-800 text-red-200 hover:bg-red-900/60 font-semibold rounded-lg text-center text-[10px] cursor-pointer"
                                    >
                                      Reject Tree
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div> </div>

                  </div>
                )}
            </div>
          </div>
        )}

        {/* TAB: ADD RENTAL FARM */}
        {activeTab === 'add_rental_farm' && (
          <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-black">Make Farms Rentable</h2>
                <p className={`text-xs mt-1 ${textMutedClass}`}>Select an already approved farm and list it for rent.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {farms.filter(f => f.status === 'verified' && parseInt(f.is_rentable) !== 1).map(farm => (
                  <div key={farm.id} className={`p-4 border rounded-2xl ${innerCardClass}`}>
                    <h3 className="font-bold text-sm text-emerald-500">{farm.name}</h3>
                    <p className={`text-xs mt-1 ${textMutedClass}`}>Farmer ID: {farm.farmer_id} | Area: {farm.total_area_acres} acres</p>
                    <div className="mt-4 flex gap-2">
                      <input type="number" min="1" id={`lease_years_${farm.id}`} defaultValue="3" className={`w-20 rounded-lg px-2 py-1 text-xs border ${inputClass}`} />
                      <span className="text-[10px] self-center">Years</span>
                      <button onClick={() => makeRentable(farm.id, document.getElementById(`lease_years_${farm.id}`).value)} className="ml-auto bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20">Make Rentable</button>
                    </div>
                  </div>
                ))}
                {farms.filter(f => f.status === 'verified' && parseInt(f.is_rentable) !== 1).length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-400 font-bold border-2 border-dashed rounded-3xl">No approved, non-rentable farms available.</div>
                )}
              </div>
              <div className="mt-12 pt-8 border-t border-slate-700/30">
                <div>
                  <h2 className="text-2xl font-black">Currently Rentable Farms</h2>
                  <p className={`text-xs mt-1 ${textMutedClass}`}>Farms that are currently available for lease to public users.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {farms.filter(f => parseInt(f.is_rentable) === 1).map(farm => (
                    <div key={farm.id} className={`p-4 border rounded-2xl ${innerCardClass}`}>
                      <h3 className="font-bold text-sm text-emerald-500">{farm.name}</h3>
                      <p className={`text-xs mt-1 ${textMutedClass}`}>Farmer ID: {farm.farmer_id} | Area: {farm.total_area_acres} acres | Lease: {farm.lease_years} Years</p>
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => removeFromRent(farm.id)} className="bg-red-600/10 text-red-500 border border-red-500/30 text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition shadow-lg">Remove from Rent</button>
                      </div>
                    </div>
                  ))}
                  {farms.filter(f => parseInt(f.is_rentable) === 1).length === 0 && (
                    <div className="col-span-full p-8 text-center text-slate-400 font-bold border-2 border-dashed rounded-3xl">No farms currently listed for rent.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
                      <th className="p-4">Market Value (₹1600/t)</th>
                      <th className="p-4">Last Synced</th>
                      <th className="p-4 text-right">Actions</th>
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
                          <td className="p-4 font-mono font-bold">₹{parseFloat(ledger.market_value).toLocaleString()}</td>
                          <td className={`p-4 ${textMutedClass}`}>{new Date(ledger.last_updated).toLocaleString()}</td>
                          <td className="p-4 text-right flex items-center justify-end">
                            <button
                              onClick={() => {
                                const { id, ...rest } = ledger;
                                setEditingEntity({ table: 'carbon_ledgers', id: ledger.id, data: rest });
                              }}
                              className="text-orange-500 hover:text-orange-600 font-bold text-[10px] uppercase tracking-wider"
                            >
                              ✏️ Edit
                            </button>
                          </td>
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



                  <button
                    type="submit"
                    className="w-full py-3 gradient-btn text-black font-extrabold rounded-xl transition mt-2 cursor-pointer"
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
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
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
                          let monthlyAmt = parseFloat(terms.amount || 0);
                          if (terms.schedule === 'quarterly') monthlyAmt = monthlyAmt / 3;
                          else if (terms.schedule === 'annually') monthlyAmt = monthlyAmt / 12;
                          return (
                            <tr 
                              key={l.id} 
                              onClick={() => {
                                const farm = farms.find(f => f.id === l.farm_id);
                                if (farm) {
                                  setSelectedFarm(farm);
                                  setActiveTab('map');
                                }
                              }}
                              className={`border-b hover:bg-emerald-500/10 cursor-pointer transition-colors ${isDark ? 'border-slate-850' : 'border-slate-150'}`}
                            >
                              <td className="p-3 font-mono font-bold">SB-LEASE-{l.id}</td>
                              <td className="p-3 font-mono">SB-FARM-{l.farm_id}</td>
                              <td className="p-3">{l.total_area_acres} Acres</td>
                              <td className="p-3">{l.start_date}</td>
                              <td className="p-3">{l.end_date}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  l.status === 'active' ? 'glow-badge-emerald' : 'glow-badge-red'
                                }`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const { id, ...rest } = l;
                                    setEditingEntity({ table: 'leases', id: l.id, data: rest });
                                  }}
                                  className="text-orange-500 hover:text-orange-600 font-bold text-[10px] uppercase tracking-wider"
                                >
                                  ✏️ Edit
                                </button>
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
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black">User Accounts Manager</h2>
                  <p className={`text-xs mt-1 ${textMutedClass}`}>Suspend, activate, or force credential overrides across platform accounts.</p>
                </div>
                <div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className={`rounded-xl px-3 py-2 outline-none border focus:border-emerald-500 transition-colors text-xs font-bold ${inputClass}`}
                  >
                    <option value="all">All Roles</option>
                    <option value="farmer">Farmer</option>
                    <option value="buyer">Buyer</option>
                  </select>
                </div>
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
                      <th className="p-4">Joined Date</th>
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
                        <td className="p-4 font-mono">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-4 capitalize">{u.role}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            u.status === 'active' ? 'glow-badge-emerald' : 'glow-badge-red'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const { id, ...rest } = u;
                              setEditingEntity({ table: 'users', id: u.id, data: rest });
                            }}
                            className="text-orange-500 hover:text-orange-600 font-bold text-[10px] uppercase tracking-wider"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setSelectedUserDetails(u)}
                            className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase border transition cursor-pointer ${
                              isDark 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/40' 
                                : 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
                            }`}
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleUserStatus(u.id, u.status)}
                            className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase border transition cursor-pointer ${
                              u.status === 'active' 
                                ? (isDark ? 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-900/40' : 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200')
                                : (isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/40' : 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200')
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


      {/* TAB: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-black">Products Management</h2>
              <p className={`text-xs mt-1 ${textMutedClass}`}>Manage product catalog, inventory, and pricing.</p>
            </div>
            {/* CRUD UI for Products */}
            <div className={`p-6 rounded-3xl border ${cardClass}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Product Catalog</h3>
                <button onClick={() => setShowAddProduct(true)} className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-xs font-extrabold transition-colors shadow-lg shadow-emerald-500/20">
                  + Add Product
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(p => (
                  <div key={p.id} className={`group flex flex-col overflow-hidden rounded-3xl border transition-all hover:-translate-y-1 hover:shadow-2xl ${
                    isDark ? 'bg-[#0a0f0d] border-slate-800 hover:shadow-emerald-900/20' : 'bg-white border-slate-200 hover:shadow-emerald-500/10'
                  }`}>
                    <div className="relative aspect-square bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
                      {p.image_url ? (
                        <img src={p.image_url.startsWith('http') ? p.image_url : `http://localhost/farm/${p.image_url}`} alt={p.name} className="w-full h-full object-contain rounded-xl group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <svg className="w-16 h-16 text-slate-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      )}
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-mono font-bold px-2 py-1 rounded-full">
                        ID: {p.id}
                      </div>
                      {parseFloat(p.stock_quantity) <= 5 && parseFloat(p.stock_quantity) > 0 && (
                        <div className="absolute top-3 right-3 bg-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-lg shadow-orange-500/30">Low Stock</div>
                      )}
                      {parseFloat(p.stock_quantity) <= 0 && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-lg shadow-red-500/30">Out of Stock</div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="font-bold text-lg leading-tight mb-1 truncate">{p.name}</h3>
                      <div className="flex justify-between items-end mt-auto pt-4">
                        <div>
                          <div className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass} mb-1`}>Stock</div>
                          <div className="font-mono text-sm">{p.stock_quantity} {p.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-500 font-black text-xl">₹{p.price}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingEntity({ table: 'products', id: p.id, data: p })}
                        className={`mt-4 w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${
                          isDark ? 'bg-slate-800 text-slate-300 hover:bg-emerald-500 hover:text-black' : 'bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        Edit Product
                      </button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                    <p className="font-bold">No products catalog found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* TAB: ORDERS */}
      {activeTab === 'orders' && (
        <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-black">Orders CRM</h2>
              <p className={`text-xs mt-1 ${textMutedClass}`}>Review and manage customer orders and inquiries.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {standardOrders.map(o => (
                <div key={o.id} className={`relative p-5 rounded-3xl border transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col gap-4 ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:shadow-emerald-900/20' : 'bg-white border-slate-200 hover:shadow-emerald-500/10'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-500 mb-1">Order #{o.id}</div>
                      <div className="font-bold text-base">{o.farmer_name && o.farmer_name !== 'N/A' && o.farmer_name !== 'null' ? o.farmer_name : (o.farmer_email || 'N/A')}</div>
                      <div className={`text-xs ${textMutedClass} font-mono`}>{o.farmer_ref || o.farmer_id}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase ${
                      o.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      o.status === 'approved' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                      o.status === 'cancelled' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-orange-950 text-orange-400 border border-orange-800'
                    }`}>
                      {o.status}
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border flex items-center gap-3 ${isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-emerald-500 truncate">{o.item_name || 'Unknown Item'}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mt-0.5">
                            {o.item_type === 'rental_farm' ? 'Rental Farm' : 
                             o.item_type === 'rental_plant' ? 'Rental Plant' : 
                             o.item_type === 'bulk' ? 'Bulk Order' : 'Product'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">x{o.quantity}</div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setEditingEntity({ table: 'orders', id: o.id, data: o })} 
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    Manage Order Details
                  </button>
                </div>
              ))}
              {standardOrders.length === 0 && (
                <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                  <p className="font-bold">No regular orders found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: BULK PURCHASES */}
      {activeTab === 'bulk_purchases' && (
        <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-black">Bulk Purchases</h2>
              <p className={`text-xs mt-1 ${textMutedClass}`}>Manage multi-item cart checkouts and high-quantity orders.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {bulkPurchaseOrders.map(o => (
                <div key={o.order_group_id || o.id} className={`relative p-5 rounded-3xl border transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col gap-4 ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:shadow-blue-900/20' : 'bg-white border-slate-200 hover:shadow-blue-500/10'
                }`}>
                  <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                    <span className="bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg shadow-blue-500/50">BULK</span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-500 mb-1">{o.isGroup ? `Cart Group #${o.order_group_id}` : `Order #${o.id}`}</div>
                      <div className="font-bold text-base">{o.farmer_name && o.farmer_name !== 'N/A' && o.farmer_name !== 'null' ? o.farmer_name : (o.farmer_email || 'N/A')}</div>
                      <div className={`text-xs ${textMutedClass} font-mono`}>{o.farmer_ref || o.farmer_id}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase ${
                      o.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      o.status === 'approved' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                      o.status === 'cancelled' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-orange-950 text-orange-400 border border-orange-800'
                    }`}>
                      {o.status}
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border flex items-center gap-3 ${isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-blue-500 truncate">{o.item_name || 'Unknown Item'}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mt-0.5">
                            {o.isGroup ? 'Multiple Items' : 'High Quantity'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">x{o.quantity}</div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setEditingEntity({ table: 'orders', id: o.id, data: o })} 
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      isDark ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    Manage Bulk Details
                  </button>
                </div>
              ))}
              {bulkPurchaseOrders.length === 0 && (
                <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                  <p className="font-bold">No bulk purchases found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </main>

        {/* Full Screen Image Modal */}
      {selectedPlant && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedPlant(null)}
        >
          <div className={`relative max-w-4xl w-full flex flex-col md:flex-row overflow-hidden rounded-2xl shadow-2xl border ${isDark ? 'bg-[#060a07] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPlant(null)}
              className="absolute top-4 right-4 bg-black/50 w-8 h-8 rounded-full text-white hover:bg-emerald-500 font-bold flex items-center justify-center cursor-pointer z-10 transition-colors"
            >
              X
            </button>
            
            {/* Image Section */}
            <div className="w-full md:w-3/5 bg-black flex items-center justify-center p-2">
              <img 
                src={selectedPlant.photo_url} 
                alt={selectedPlant.species} 
                className="w-full h-auto max-h-[60vh] md:max-h-[85vh] object-contain rounded-xl"
              />
            </div>

            {/* Details Section */}
            <div className="w-full md:w-2/5 p-6 flex flex-col gap-4 overflow-y-auto max-h-[40vh] md:max-h-[85vh]">
              <div>
                <h3 className="text-2xl font-black capitalize text-emerald-500 mb-1">{selectedPlant.species}</h3>
                <div className={`text-xs font-mono mb-3 ${textMutedClass}`}>Plant ID: SB-TREE-{selectedPlant.id}</div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                  selectedPlant.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  selectedPlant.status === 'rejected' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-orange-950 text-orange-400 border border-orange-800'
                }`}>
                  Status: {selectedPlant.status}
                </span>
              </div>

              <div className={`space-y-3 text-sm border-t pt-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div>
                  <strong className="block text-[10px] uppercase tracking-wider text-emerald-500/70 mb-0.5">Planted Date</strong>
                  <span>{new Date(selectedPlant.planted_at).toLocaleString()}</span>
                </div>
                <div>
                  <strong className="block text-[10px] uppercase tracking-wider text-emerald-500/70 mb-0.5">GPS Coordinates (EXIF)</strong>
                  <span className="font-mono text-xs break-all">{selectedPlant.coordinates}</span>
                </div>
                <div>
                  <strong className="block text-[10px] uppercase tracking-wider text-emerald-500/70 mb-0.5">Farm ID</strong>
                  <span className="font-mono">SB-FARM-{selectedPlant.farm_id}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUserDetails && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedUserDetails(null)}
        >
          <div className={`relative max-w-xl w-full p-6 overflow-hidden rounded-2xl shadow-2xl border ${cardClass}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black capitalize">{selectedUserDetails.farmer_id || 'ADMIN_USER'}</h3>
                <p className={`text-xs font-mono mt-1 ${textMutedClass}`}>{selectedUserDetails.email}</p>
              </div>
              <button 
                onClick={() => setSelectedUserDetails(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold cursor-pointer transition-colors ${inputClass} hover:bg-red-500 hover:text-white hover:border-red-500`}
              >
                X
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <strong className={`block text-[10px] uppercase tracking-wider mb-0.5 ${textMutedClass}`}>Contact</strong>
                <span className="font-mono">{selectedUserDetails.contact_number || 'N/A'}</span>
              </div>
              <div>
                <strong className={`block text-[10px] uppercase tracking-wider mb-0.5 ${textMutedClass}`}>Joined</strong>
                <span className="font-mono">{new Date(selectedUserDetails.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                <strong className={`block text-[10px] uppercase tracking-wider mb-0.5 ${textMutedClass}`}>Role</strong>
                <span className="capitalize">{selectedUserDetails.role}</span>
              </div>
              <div>
                <strong className={`block text-[10px] uppercase tracking-wider mb-0.5 ${textMutedClass}`}>Status</strong>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                  selectedUserDetails.status === 'active' 
                    ? (isDark ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-100 text-emerald-700 border border-emerald-300') 
                    : (isDark ? 'bg-red-950/40 text-red-400 border border-red-800/40' : 'bg-red-100 text-red-700 border border-red-300')
                }`}>
                  {selectedUserDetails.status}
                </span>
              </div>
            </div>

            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>Registered Farms</h4>
            <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
              {farms.filter(f => f.farmer_id === selectedUserDetails.farmer_id).length === 0 ? (
                <div className={`text-xs italic ${textMutedClass}`}>No farms registered.</div>
              ) : (
                farms.filter(f => f.farmer_id === selectedUserDetails.farmer_id).map(farm => (
                  <div 
                    key={farm.id} 
                    onClick={() => {
                      setSelectedFarm(farm);
                      setActiveTab('map');
                      setSelectedUserDetails(null);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors hover:border-emerald-500 group ${
                      isDark ? 'bg-black/20 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm group-hover:text-emerald-500 transition-colors">{farm.name}</div>
                      <div className={`text-[10px] font-mono mt-1 ${textMutedClass}`}>SB-FARM-{farm.id} • {farm.total_area_acres} Acres</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full font-bold uppercase text-[9px] ${
                      farm.status === 'verified' 
                        ? (isDark ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-100 text-emerald-700 border border-emerald-300')
                        : farm.status === 'rejected' 
                          ? (isDark ? 'bg-red-950/40 text-red-400 border border-red-800/40' : 'bg-red-100 text-red-700 border border-red-300')
                          : (isDark ? 'bg-orange-950/40 text-orange-400 border border-orange-800/40' : 'bg-orange-100 text-orange-700 border border-orange-300')
                    }`}>
                      {farm.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 mt-6 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>Purchase History</h4>
            <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
              {orders.filter(o => o.farmer_id == selectedUserDetails.id).length === 0 ? (
                <div className={`text-xs italic ${textMutedClass}`}>No purchases made.</div>
              ) : (
                orders.filter(o => o.farmer_id == selectedUserDetails.id).map(order => (
                  <div 
                    key={order.id} 
                    onClick={() => {
                      setActiveTab(order.order_group_id || parseInt(order.quantity) >= 15 ? 'bulk_purchases' : 'orders');
                      setSelectedUserDetails(null);
                      setEditingEntity({ table: 'orders', id: order.id, data: order });
                      window.scrollTo(0, 0);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors ${isDark ? 'bg-black/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      {order.image_url ? (
                        <img src={order.image_url.startsWith('http') ? order.image_url : `http://localhost/farm/${order.image_url}`} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">#</div>
                      )}
                      <div>
                        <div className="font-bold text-sm">{order.item_name}</div>
                        <div className={`text-[10px] font-mono mt-1 ${textMutedClass}`}>ORDER-{order.id} • Qty: {order.quantity}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-500">₹{(parseFloat(order.product_price) * parseInt(order.quantity)).toFixed(2)}</div>
                      <div className={`text-[9px] uppercase font-bold mt-1 ${order.status === 'delivered' ? 'text-emerald-500' : 'text-orange-500'}`}>{order.status}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Universal Edit Modal */}
      {editingEntity && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn" onClick={() => setEditingEntity(null)}>
          <div 
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border flex flex-col ${isDark ? 'bg-[#0a0f0d] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className="text-xl font-black capitalize">Edit {editingEntity.table.replace(/_/g, ' ')}</h3>
                <p className={`text-xs font-mono uppercase mt-1 ${textMutedClass}`}>
                  ID: {editingEntity.id}
                </p>
              </div>
              <button onClick={() => setEditingEntity(null)} className="font-bold hover:text-red-500 cursor-pointer text-xl">&times;</button>
            </div>
            
            {editingEntity.table === 'orders' ? (
              <form onSubmit={handleSaveEdit} className="flex flex-col flex-grow overflow-hidden">
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-6">
                  {/* Status & Basic Info */}
                  <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Current Status</div>
                      <select
                        value={editingEntity.data.status ? String(editingEntity.data.status).toLowerCase() : ''}
                        onChange={(e) => setEditingEntity(prev => ({ ...prev, data: { ...prev.data, status: e.target.value } }))}
                        className={`rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 font-bold text-sm ${inputClass}`}
                      >
                        <option value="" disabled>Select Status...</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="text-right">
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Order Date</div>
                      <div className="font-mono text-sm">{new Date(editingEntity.data.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Customer Info & Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Customer Details</h4>
                      <div className="space-y-3">
                        <div>
                          <div className={`text-[10px] uppercase ${textMutedClass}`}>Farmer Name</div>
                          <div className="font-bold">{editingEntity.data.farmer_name && editingEntity.data.farmer_name !== 'N/A' && editingEntity.data.farmer_name !== 'null' ? editingEntity.data.farmer_name : (editingEntity.data.farmer_email || 'N/A')}</div>
                        </div>
                        <div>
                          <div className={`text-[10px] uppercase ${textMutedClass}`}>Reference ID</div>
                          <div className="font-mono text-xs">{editingEntity.data.farmer_ref || editingEntity.data.farmer_id}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Delivery Address</h4>
                      <div className={`p-4 rounded-xl text-sm leading-relaxed ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                        {editingEntity.data.address ? (
                          <div className="whitespace-pre-line font-medium text-slate-400">
                            {editingEntity.data.address.replace(/Name: (.*?)\n/, 'Name: $1\n').replace(/Mobile: (.*?)\n/, 'Contact: $1\n')}
                          </div>
                        ) : (
                          <span className="italic text-slate-500">No specific delivery address provided.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 border-b pb-2 dark:border-slate-800">Items Ordered</h4>
                    <div className="space-y-3">
                      {editingEntity.data.isGroup ? (
                        editingEntity.data.grouped_items.map((item, idx) => (
                          <div key={idx} className={`p-4 rounded-xl flex items-center justify-between border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-4">
                              {item.image_url ? (
                                <img src={item.image_url.startsWith('http') ? item.image_url : `http://localhost/farm/${item.image_url}`} alt={item.item_name} className="w-12 h-12 rounded-lg object-cover bg-white" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center">?</div>
                              )}
                              <div>
                                <div className="font-bold">{item.item_name}</div>
                                <div className={`text-[10px] font-bold uppercase ${textMutedClass} mt-0.5`}>Type: {item.item_type}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-emerald-500 font-black">₹{item.product_price}</div>
                              <div className="text-xs font-bold text-slate-400">Qty: {item.quantity}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={`p-4 rounded-xl flex items-center justify-between border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-4">
                            {editingEntity.data.image_url ? (
                              <img src={editingEntity.data.image_url.startsWith('http') ? editingEntity.data.image_url : `http://localhost/farm/${editingEntity.data.image_url}`} alt={editingEntity.data.item_name} className="w-16 h-16 rounded-xl object-cover bg-white" />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">?</div>
                            )}
                            <div>
                              <div className="font-bold text-lg">{editingEntity.data.item_name}</div>
                              <div className={`text-[10px] font-bold uppercase ${textMutedClass} mt-0.5`}>Type: {editingEntity.data.item_type}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-500 font-black text-xl">₹{editingEntity.data.product_price}</div>
                            <div className="text-sm font-bold text-slate-400 mt-1">Quantity: {editingEntity.data.quantity}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className={`p-5 border-t flex justify-end gap-3 ${isDark ? 'border-slate-800 bg-[#0a0f0d]' : 'border-slate-200 bg-white'}`}>
                  <button type="button" onClick={() => setEditingEntity(null)} className={`px-4 py-2 border text-xs font-semibold rounded-xl cursor-pointer ${inputClass}`}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Status'}
                  </button>
                </div>
              </form>
            ) : editingEntity.table === 'products' ? (
              <form onSubmit={handleSaveEdit} className="flex flex-col flex-grow overflow-hidden">
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-6">
                  {/* Header / Image Preview */}
                  <div className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-4 border ${isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white shadow-sm flex items-center justify-center">
                      {editingEntity.data.image_url ? (
                        <img src={editingEntity.data.image_url.startsWith('http') ? editingEntity.data.image_url : `http://localhost/farm/${editingEntity.data.image_url}`} alt={editingEntity.data.name} className="w-full h-full object-contain" />
                      ) : (
                        <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      )}
                    </div>
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-1">
                        <label className={`block text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Product Image</label>
                        <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5">
                          <button type="button" onClick={() => setImageInputType('url')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${imageInputType === 'url' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>URL</button>
                          <button type="button" onClick={() => setImageInputType('upload')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${imageInputType === 'upload' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Upload</button>
                        </div>
                      </div>
                      {imageInputType === 'url' ? (
                        <input 
                          type="text" 
                          value={editingEntity.data.image_url || ''} 
                          onChange={(e) => setEditingEntity(prev => ({...prev, data: {...prev.data, image_url: e.target.value}}))}
                          className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 font-mono text-xs ${inputClass}`}
                          placeholder="https://..."
                        />
                      ) : (
                        <input 
                          type="file" 
                          accept="image/jpeg, image/png, image/webp, image/gif" 
                          onChange={(e) => setImageFile(e.target.files[0])} 
                          className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 font-mono text-xs ${inputClass} file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-500 file:text-black hover:file:bg-emerald-400`} 
                        />
                      )}
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Product Name</label>
                      <input 
                        type="text" 
                        required
                        value={editingEntity.data.name || ''} 
                        onChange={(e) => setEditingEntity(prev => ({...prev, data: {...prev.data, name: e.target.value}}))}
                        className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 font-bold text-sm ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Description</label>
                      <textarea 
                        rows="3"
                        value={editingEntity.data.description || ''} 
                        onChange={(e) => setEditingEntity(prev => ({...prev, data: {...prev.data, description: e.target.value}}))}
                        className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 font-medium text-sm ${inputClass}`}
                      ></textarea>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Price (₹)</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          required
                          value={editingEntity.data.price || ''} 
                          onChange={(e) => setEditingEntity(prev => ({...prev, data: {...prev.data, price: e.target.value}}))}
                          className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 font-bold text-sm text-emerald-600 dark:text-emerald-400 ${inputClass}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Locality</label>
                        <input 
                          type="text" 
                          value={editingEntity.data.locality || ''} 
                          onChange={(e) => setEditingEntity(prev => ({...prev, data: {...prev.data, locality: e.target.value}}))}
                          className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 font-bold text-sm ${inputClass}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Stock Quantity</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editingEntity.data.stock_quantity || ''} 
                          onChange={(e) => setEditingEntity(prev => ({...prev, data: {...prev.data, stock_quantity: e.target.value}}))}
                          className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 font-bold text-sm ${inputClass}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Unit</label>
                        <input 
                          type="text" 
                          value={editingEntity.data.unit || ''} 
                          onChange={(e) => setEditingEntity(prev => ({...prev, data: {...prev.data, unit: e.target.value}}))}
                          className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 font-bold text-sm ${inputClass}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-5 border-t flex justify-end gap-3 ${isDark ? 'border-slate-800 bg-[#0a0f0d]' : 'border-slate-200 bg-white'}`}>
                  <button type="button" onClick={() => setEditingEntity(null)} className={`px-4 py-2 border text-xs font-semibold rounded-xl cursor-pointer ${inputClass}`}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-4">
                {Object.keys(editingEntity.data).map(key => {
                  // Skip non-editable or sensitive fields
                  if (['id', 'created_at', 'updated_at', 'last_updated', 'password_hash', 'boundary_polygon', 'geom', 'coordinates', 'photo_url', 'isGroup', 'grouped_items', 'order_group_id'].includes(key)) return null;
                  
                  let inputType = 'text';
                  if (key.includes('email')) inputType = 'email';
                  else if (key.includes('date')) inputType = 'date';
                  else if (key.includes('area') || key.includes('amount') || key.includes('value') || key.includes('credits') || key.includes('biomass')) inputType = 'number';
                  else if (key.includes('contact') || key.includes('phone')) inputType = 'tel';
                  
                  const isReadOnly = (key === 'farmer_id' && !['users', 'farms'].includes(editingEntity.table)) ||
                                     (key === 'total_area_acres' && editingEntity.table !== 'farms');
                  
                  return (
                    <div key={key}>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>
                        {key.replace(/_/g, ' ')}
                      </label>
                      {key === 'status' ? (
                        <select
                          value={editingEntity.data[key] ? String(editingEntity.data[key]).toLowerCase() : ''}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            setEditingEntity(prev => ({
                              ...prev,
                              data: { ...prev.data, [key]: e.target.value }
                            }))
                          }}
                          className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <option value="" disabled>Select Status...</option>
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="verified">Verified</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="rejected">Rejected</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="suspended">Suspended</option>
                          <option value="expired">Expired</option>
                        </select>
                      ) : key === 'is_rentable' ? (
                        <select
                          value={editingEntity.data[key] || 0}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            setEditingEntity(prev => ({
                              ...prev,
                              data: { ...prev.data, [key]: parseInt(e.target.value) }
                            }))
                          }}
                          className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <option value={0}>No</option>
                          <option value={1}>Yes</option>
                        </select>
                      ) : (
                        <input
                          type={inputType}
                          step={inputType === 'number' ? 'any' : undefined}
                          min={inputType === 'number' ? '0' : undefined}
                          value={editingEntity.data[key] || ''}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            setEditingEntity(prev => ({
                              ...prev,
                              data: { ...prev.data, [key]: e.target.value }
                            }))
                          }}
                          className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                      )}
                    </div>
                  )
                })}
                
                {editingEntity.data.isGroup && (
                  <div className={`mt-6 border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <h4 className="text-sm font-bold mb-2">Items in this Group:</h4>
                    <div className="space-y-2">
                      {editingEntity.data.grouped_items.map((item, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'border-slate-800 bg-[#111e16]' : 'border-slate-200 bg-white'} flex justify-between`}>
                          <div>
                            <div className="font-bold text-xs">{item.item_name}</div>
                            <div className={`text-[10px] ${textMutedClass}`}>Qty: {item.quantity} | Type: {item.item_type}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingEntity(null)} className={`px-4 py-2 border text-xs font-semibold rounded-xl cursor-pointer ${inputClass}`}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className={`relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border ${cardClass}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className="text-xl font-black">Add New Product</h3>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${textMutedClass}`}>Product Catalog</p>
              </div>
              <button onClick={() => setShowAddProduct(false)} className="font-bold hover:text-red-500 cursor-pointer text-xl">&times;</button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Product Name *</label>
                <input required type="text" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Description</label>
                <textarea rows="3" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass}`}></textarea>
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Price (₹) *</label>
                <input required type="number" step="0.01" min="0" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Locality</label>
                <input type="text" placeholder="e.g., Hyderabad" value={newProduct.locality} onChange={(e) => setNewProduct({...newProduct, locality: e.target.value})} className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Stock Quantity</label>
                  <input type="number" min="0" value={newProduct.stock_quantity} onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value})} className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass}`} />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Unit</label>
                  <input type="text" placeholder="e.g., kg, cases" value={newProduct.unit} onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})} className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass}`} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Product Image</label>
                  <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5">
                    <button type="button" onClick={() => setImageInputType('url')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${imageInputType === 'url' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>URL</button>
                    <button type="button" onClick={() => setImageInputType('upload')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${imageInputType === 'upload' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Upload</button>
                  </div>
                </div>
                {imageInputType === 'url' ? (
                  <input type="text" placeholder="https://..." value={newProduct.image_url} onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})} className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass}`} />
                ) : (
                  <input type="file" accept="image/jpeg, image/png, image/webp, image/gif" onChange={(e) => setImageFile(e.target.files[0])} className={`w-full rounded-xl px-4 py-2 outline-none border focus:border-emerald-500 transition-colors font-mono text-xs ${inputClass} file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-500 file:text-black hover:file:bg-emerald-400`} />
                )}
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddProduct(false)} className={`px-4 py-2 border text-xs font-semibold rounded-xl cursor-pointer ${inputClass}`}>Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">
                  {loading ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

