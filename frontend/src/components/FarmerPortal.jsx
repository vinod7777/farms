import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Marker, CircleMarker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import ProductsPage from './ProductsPage';
import RentalsPage from './RentalsPage';
import BulkOrdersPage from './BulkOrdersPage';
import MyOrders from './MyOrders';

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

// Helper center setter
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.setView(center, zoom);
    }
  }, [center, zoom]);
  return null;
}

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

// Click listener inside React Leaflet
function MapEventsHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// Simple IndexedDB Utility
const DB_NAME = 'SahasraOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_farms';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveOfflineFarm(farmData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(farmData);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function getOfflineFarms() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteOfflineFarm(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Haversine distance calculator
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Spherical Shoelace area calculator
function calculatePolygonAreaSqMeters(coords) {
  if (coords.length < 3) return 0;
  let sumLat = 0;
  coords.forEach(pt => sumLat += pt[1]);
  const avgLat = (sumLat / coords.length) * Math.PI / 180;
  const R = 6371000.0;
  const projected = coords.map(pt => {
    const lng = pt[0];
    const lat = pt[1];
    const x = R * (lng * Math.PI / 180) * Math.cos(avgLat);
    const y = R * (lat * Math.PI / 180);
    return [x, y];
  });
  let area = 0.0;
  const n = projected.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += projected[i][0] * projected[j][1];
    area -= projected[j][0] * projected[i][1];
  }
  return Math.abs(area) / 2.0;
}

export default function FarmerPortal() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('sb_user') || '{}');
  const token = localStorage.getItem('sb_auth_token');

  // Tab State: 'dashboard' | 'mapper' | 'lands' | 'plants'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dark/Light Theme state
  const [theme, setTheme] = useState(localStorage.getItem('sb_theme') || 'light');

  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [offlineFarms, setOfflineFarms] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [totalPlantsCount, setTotalPlantsCount] = useState(0);
  
  // New Land Form Details States
  const [farmName, setFarmName] = useState('');
  const [farmingType, setFarmingType] = useState('agroforest');
  const [soilType, setSoilType] = useState('');
  const [waterSource, setWaterSource] = useState('');
  const [irrigationSystem, setIrrigationSystem] = useState('none');
  const [cropInsurance, setCropInsurance] = useState('no');
  const [visitSlot, setVisitSlot] = useState('');
  const [leaseYears, setLeaseYears] = useState('3');
  const [documentFiles, setDocumentFiles] = useState([]);

  // E-commerce & Cart States
  const [cart, setCart] = useState([]);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState(null);
  const [buyNowQuantity, setBuyNowQuantity] = useState(1);
  const [buyNowAddress, setBuyNowAddress] = useState('');
  const [cartAddress, setCartAddress] = useState('');

  // Land Mapping States
  const [mappingActive, setMappingActive] = useState(false);
  const [mapType, setMapType] = useState('management_support');
  const [trackedCoords, setTrackedCoords] = useState([]); 
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [calculatedAcres, setCalculatedAcres] = useState(0);
  const [calculatedPerimeter, setCalculatedPerimeter] = useState(0);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);
  const [currentGpsPos, setCurrentGpsPos] = useState(null);
  const watchIdRef = useRef(null);

  // Plant Submission States
  const [plantSpecies, setPlantSpecies] = useState('Teak');
  const [customSpecies, setCustomSpecies] = useState('');
  const [plantFile, setPlantFile] = useState(null);
  const [plantCoordinates, setPlantCoordinates] = useState(null); 
  const [plantLoading, setPlantLoading] = useState(false);
  const [plantMessage, setPlantMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const [farmMessage, setFarmMessage] = useState({ type: '', text: '' });
  const [selectedPlant, setSelectedPlant] = useState(null);

  // Theme Toggler
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

  // Fetch registered farms
  const fetchFarms = async () => {
    setLoading(true);
    try {
      const res = await fetch('api/farms.php', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (res.ok && data.farms) {
        setFarms(data.farms);
        loadTotalPlantsCount(data.farms);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch plants for selected farm
  const fetchPlants = async (farmId) => {
    try {
      const res = await fetch(`api/plants.php?farm_id=${farmId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (res.ok && data.plants) {
        setPlants(data.plants);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Aggregate plant counts
  const loadTotalPlantsCount = async (farmList) => {
    let count = 0;
    for (const farm of farmList) {
      try {
        const res = await fetch(`api/plants.php?farm_id=${farm.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          logout();
          return;
        }
        const data = await res.json();
        if (res.ok && data.plants) {
          count += data.plants.length;
        }
      } catch (e) {
        console.error(e);
      }
    }
    setTotalPlantsCount(count);
  };

  // Load Offline Cache
  const loadOfflineCache = async () => {
    try {
      const cached = await getOfflineFarms();
      setOfflineFarms(cached);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFarms();
    loadOfflineCache();
  }, []);

  useEffect(() => {
    if (selectedFarm) {
      fetchPlants(selectedFarm.id);
    } else {
      setPlants([]);
    }
  }, [selectedFarm]);

  // Recenter Map to User Position (With Low Accuracy Fallback)
  const recenterMap = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setCurrentGpsPos([position.coords.latitude, position.coords.longitude]);
          setMapZoom(17);
        },
        (err) => {
          // Fallback to low accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setMapCenter([position.coords.latitude, position.coords.longitude]);
              setCurrentGpsPos([position.coords.latitude, position.coords.longitude]);
              setMapZoom(17);
            },
            (err2) => {
              console.warn("Could not retrieve current location: " + err2.message);
            },
            { enableHighAccuracy: false, timeout: 10000 }
          );
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Handle map manual clicking
  const handleMapClick = (lat, lng) => {
    setTrackedCoords((prev) => {
      const newPt = [lng, lat];
      const newPath = [...prev, newPt];
      
      if (newPath.length >= 2) {
        let totalDist = 0;
        for (let i = 0; i < newPath.length - 1; i++) {
          totalDist += getDistanceMeters(newPath[i][1], newPath[i][0], newPath[i + 1][1], newPath[i + 1][0]);
        }
        setCalculatedPerimeter(totalDist);
      }
      
      if (newPath.length >= 3) {
        const sqMeters = calculatePolygonAreaSqMeters(newPath);
        const acres = sqMeters / 4046.86;
        setCalculatedAcres(acres);
      }
      return newPath;
    });
  };

  // Handle boundary walking geolocation tracking (With Low Accuracy Fallback)
  const startMapping = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setTrackedCoords([]);
    setCalculatedAcres(0);
    setCalculatedPerimeter(0);
    setMappingActive(true);
    setFarmMessage({ type: '', text: '' });

    // Focus center on location
    recenterMap();

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const handleGpsSuccess = (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      setGpsAccuracy(accuracy);
      setCurrentGpsPos([latitude, longitude]);
      
      // If we are in high accuracy mode, filter bad coords.
      if (accuracy > 15 && options.enableHighAccuracy) {
        return; 
      }

      setTrackedCoords((prev) => {
        const newPt = [longitude, latitude];
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last[0] === longitude && last[1] === latitude) {
            return prev;
          }
        }
        
        const newPath = [...prev, newPt];
        if (newPath.length >= 2) {
          let totalDist = 0;
          for (let i = 0; i < newPath.length - 1; i++) {
            totalDist += getDistanceMeters(newPath[i][1], newPath[i][0], newPath[i + 1][1], newPath[i + 1][0]);
          }
          setCalculatedPerimeter(totalDist);
        }
        if (newPath.length >= 3) {
          const sqMeters = Math.abs(calculatePolygonAreaSqMeters(newPath));
          const acres = sqMeters / 4046.86;
          setCalculatedAcres(acres);
        }
        return newPath;
      });
    };

    const handleGpsError = (error) => {
      console.warn("GPS watch position error:", error.message);
      // Restart with low accuracy if it times out
      if (error.code === 3 && options.enableHighAccuracy) {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        options.enableHighAccuracy = false;
        options.timeout = 15000;
        watchIdRef.current = navigator.geolocation.watchPosition(handleGpsSuccess, (err) => {
          console.warn("Low accuracy GPS watch failed:", err.message);
        }, options);
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handleGpsSuccess, handleGpsError, options);
  };

  const stopMapping = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setMappingActive(false);
    
    if (!farmName.trim() || farmName.length < 3) {
      alert("Please enter a valid farm name (at least 3 characters) before saving.");
      return;
    }

    if (mapType === 'leased_to_platform' && (!leaseYears || isNaN(leaseYears) || parseInt(leaseYears) < 1)) {
      alert("Please enter a valid number of lease years.");
      return;
    }

    if (trackedCoords.length < 3) {
      alert("A valid land boundary must contain at least 3 mapped corners.");
      return;
    }
    
    const firstPoint = trackedCoords[0];
    const closedCoords = [...trackedCoords, firstPoint];
    const coordsStr = closedCoords.map(pt => `${pt[0]} ${pt[1]}`).join(', ');
    const boundaryPolygonWkt = `POLYGON((${coordsStr}))`;
    const finalAcres = calculatedAcres || 0.1;
    
    if (!documentFiles || documentFiles.length === 0) {
      alert("Please upload at least one land document (PDF or Image).");
      return;
    }
    
    setLoading(true);
    let finalDocumentUrl = null;
    
    try {
      if (documentFiles && documentFiles.length > 0) {
        finalDocumentUrl = [];
        for (const file of documentFiles) {
          const formData = new FormData();
          formData.append('document', file);
          const uploadRes = await fetch('api/upload_document.php', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.success) {
            finalDocumentUrl.push(uploadData.url);
          } else {
            throw new Error(uploadData.error || `Failed to upload document: ${file.name}`);
          }
        }
      }
      
      const farmSubmission = {
        name: farmName.trim(),
        type: mapType,
        farming_type: farmingType,
        soil_type: soilType || null,
        water_source: waterSource || null,
        irrigation_system: irrigationSystem || null,
        crop_insurance: cropInsurance,
        visit_slot: visitSlot || null,
        lease_years: mapType === 'leased_to_platform' ? parseInt(leaseYears) : null,
        boundary_polygon: boundaryPolygonWkt,
        total_area_acres: finalAcres.toFixed(4),
        document_urls: finalDocumentUrl,
        raw_coords: closedCoords,
        date_logged: new Date().toISOString()
      };
    
      const res = await fetch('api/farms.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(farmSubmission)
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      
      if (res.ok && data.success) {
        setFarmMessage({ type: 'success', text: "Boundary submitted to admin successfully!" });
        fetchFarms();
        // Reset form details
        setFarmName('');
        setFarmingType('agroforest');
        setSoilType('');
        setWaterSource('');
        setIrrigationSystem('none');
        setCropInsurance('no');
        setVisitSlot('');
        setLeaseYears(3);
      } else {
        throw new Error(data.error || "Server registration failed.");
      }
    } catch (err) {
      await saveOfflineFarm({ ...farmSubmission, id: Date.now() });
      setFarmMessage({ 
        type: 'warning', 
        text: `Network issues: ${err.message}. Saved to local device cache.` 
      });
      loadOfflineCache();
    }
    setTrackedCoords([]);
  };

  const syncOfflineData = async () => {
    if (offlineFarms.length === 0) return;
    setSyncing(true);
    let successCount = 0;
    for (const cached of offlineFarms) {
      try {
        const res = await fetch('api/farms.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: cached.name,
            type: cached.type,
            farming_type: cached.farming_type,
            soil_type: cached.soil_type,
            water_source: cached.water_source,
            irrigation_system: cached.irrigation_system,
            crop_insurance: cached.crop_insurance,
            visit_slot: (cached.visit_slot === 'saturday' || cached.visit_slot === 'sunday' || !cached.visit_slot) ? new Date().toISOString().split('T')[0] : cached.visit_slot,
            lease_years: cached.lease_years,
            boundary_polygon: cached.boundary_polygon,
            total_area_acres: cached.total_area_acres
          })
        });
        if (res.status === 401) {
          logout();
          setSyncing(false);
          return;
        }
        if (res.ok) {
          await deleteOfflineFarm(cached.id);
          successCount++;
        }
      } catch (err) {}
    }
    setSyncing(false);
    if (successCount > 0) {
      fetchFarms();
      loadOfflineCache();
      alert(`Synced ${successCount} farm(s) successfully.`);
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPlantFile(file);
    setPlantMessage({ type: '', text: '' });
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPlantCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          // Fallback to low accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setPlantCoordinates({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (err2) => {
              console.warn("Failed to get plant location:", err2);
            },
            { enableHighAccuracy: false, timeout: 10000 }
          );
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const handlePlantSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFarm) return;
    if (!plantFile) {
      setPlantMessage({ type: 'error', text: 'Please capture or select a photo of the tree.' });
      return;
    }
    if (!plantCoordinates) {
      setPlantMessage({ type: 'error', text: 'GPS location is required. Please ensure location services are enabled.' });
      return;
    }

    const finalSpecies = plantSpecies === 'Other' ? customSpecies.trim() : plantSpecies;
    if (!finalSpecies) {
      setPlantMessage({ type: 'error', text: 'Please specify the tree species.' });
      return;
    }

    setPlantLoading(true);
    setPlantMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('farm_id', selectedFarm.id);
    formData.append('species', finalSpecies);
    formData.append('coordinates', `POINT(${plantCoordinates.lng} ${plantCoordinates.lat})`);
    formData.append('photo', plantFile);

    try {
      const res = await fetch('api/plants.php', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        // If Hostinger returns HTML (like a 403 Forbidden or PHP warning)
        const strippedText = rawText.replace(/(<([^>]+)>)/gi, "").trim();
        setPlantMessage({ type: 'error', text: `Server Error (${res.status}): ${strippedText.substring(0, 100)}...` });
        setPlantLoading(false);
        return;
      }
      
      if (res.ok && data.success) {
        setPlantMessage({ type: 'success', text: "Tree uploaded and GPS-EXIF verified successfully!" });
        setPlantFile(null);
        setPlantCoordinates(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchPlants(selectedFarm.id);
        fetchFarms(); // update tree totals
      } else {
        setPlantMessage({ type: 'error', text: data.error || "Upload failed." });
      }
    } catch (err) {
      setPlantMessage({ type: 'error', text: `Network Error: ${err.message}` });
    } finally {
      setPlantLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const totalAcres = farms.reduce((acc, curr) => acc + parseFloat(curr.total_area_acres), 0);
  const verifiedCount = farms.filter(f => f.status === 'verified').length;

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-300 ${bgClass}`}>
      
      {/* Mobile Top Header */}
      <header className={`lg:hidden flex justify-between items-center p-4 border-b fixed top-0 w-full z-40 transition-colors duration-300 ${sidebarClass}`}>
        <div className="flex items-center gap-3">
          <img src="Logo-SF.webp" alt="Sahasra Bharat" className="h-8 w-auto object-contain" />
          <span className={`text-xl font-extrabold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Sahasra</span>
          <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase">Farmer</span>
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
      <nav className={`lg:hidden fixed bottom-0 left-0 w-full border-t flex justify-around items-center px-2 py-3 z-40 transition-colors duration-300 ${sidebarClass}`}>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('dashboard')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'dashboard' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>
          <span className="text-[10px]">Dashboard</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('mapper')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'mapper' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="text-[10px]">Map</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('lands')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'lands' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0022 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          <span className="text-[10px]">Lands</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('plants')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'plants' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <span className="text-[10px]">Trees</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('products')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'products' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <span className="text-[10px]">Products</span>
        </button>
        <button onClick={() => window.scrollTo(0, 0) || setActiveTab('bulk')} className={`flex flex-col items-center p-2 rounded-xl transition ${activeTab === 'bulk' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span className="text-[10px]">Cart</span>
        </button>
      </nav>

      {/* Sidebar Navigation (Desktop) */}
      <aside className={`hidden lg:flex lg:w-64 border-r flex-col p-6 gap-6 h-screen fixed top-0 left-0 z-20 transition-colors duration-300 ${sidebarClass}`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-emerald-400">Sahasra</span>
              <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase">Farmer</span>
            </div>
            <p className={`text-[10px] mt-1 font-semibold truncate ${textMutedClass}`}>ID: {user.farmer_id}</p>
          </div>
        </div>

        {/* Theme Switcher Widget */}
        <div className={`p-3 rounded-2xl flex items-center justify-between border ${innerCardClass}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Theme Mode</span>
          <button 
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition flex items-center gap-1 border border-emerald-500/20"
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <div className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Navigation</div>
        
        <nav className="flex flex-col gap-2 flex-grow text-xs font-semibold overflow-y-auto min-h-0 pr-1 pb-2">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'dashboard' ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' : `text-slate-400 hover:text-white hover:bg-slate-800`
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('mapper')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'mapper' ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' : `text-slate-400 hover:text-white hover:bg-slate-800`
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Boundary Mapper
          </button>
          
          <button 
            onClick={() => setActiveTab('lands')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'lands' ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' : `text-slate-400 hover:text-white hover:bg-slate-800`
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0022 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Your Registered Lands
          </button>
          
          <button 
            onClick={() => setActiveTab('plants')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'plants' ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' : `text-slate-400 hover:text-white hover:bg-slate-800`
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Plant Catalog
          </button>

          <div className={`text-[10px] mt-4 font-bold uppercase tracking-wider ${textMutedClass}`}>Services</div>
          
          <button 
            onClick={() => setActiveTab('products')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'products' ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' : `text-slate-400 hover:text-white hover:bg-slate-800`
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Products
          </button>

          <button 
            onClick={() => setActiveTab('rentals')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'rentals' ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' : `text-slate-400 hover:text-white hover:bg-slate-800`
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Rental Services
          </button>

          <button 
            onClick={() => setActiveTab('bulk')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'bulk' ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' : `text-slate-400 hover:text-white hover:bg-slate-800`
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Shopping Cart
          </button>

          <button 
            onClick={() => setActiveTab('orders')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
              activeTab === 'orders' ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/10' : `text-slate-400 hover:text-white hover:bg-slate-800`
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            My Orders
          </button>
        </nav>

        <div className="flex flex-col gap-2 mt-auto border-t border-slate-800 pt-4 text-xs font-semibold">
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-2.5 border border-slate-700 hover:bg-slate-800 rounded-xl transition text-center"
          >
            Landing Page
          </button>
          <button 
            onClick={logout}
            className="w-full py-2.5 bg-red-950/60 border border-red-800 text-red-200 rounded-xl hover:bg-red-900/60 transition text-center"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow lg:ml-64 p-4 lg:p-8 pt-24 pb-28 lg:pt-8 lg:pb-8 min-w-0">
        
        {/* TAB 1: DASHBOARD SUMMARY */}
        {activeTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-3xl font-black">Farmer Dashboard</h2>
              <p className={`text-xs mt-1 ${textMutedClass}`}>Real-time asset value and agricultural logs tracker.</p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className={`p-6 rounded-3xl flex flex-col justify-between border ${cardClass}`}>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass}`}>Registered Farms</span>
                <span className="text-3xl font-black mt-4">{farms.length}</span>
                <span className="text-[10px] text-emerald-500 mt-2 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                  {verifiedCount} Verified Lands
                </span>
              </div>

              <div className={`p-6 rounded-3xl flex flex-col justify-between border ${cardClass}`}>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass}`}>Total Covered Area</span>
                <span className="text-3xl font-black mt-4">{totalAcres.toFixed(2)} ac</span>
                <span className={`text-[10px] mt-2 ${textMutedClass}`}>Sum of mapped polygon regions</span>
              </div>

              <div className={`p-6 rounded-3xl flex flex-col justify-between border ${cardClass}`}>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${textMutedClass}`}>Cataloged Trees</span>
                <span className="text-3xl font-black mt-4">{totalPlantsCount}</span>
                <span className={`text-[10px] mt-2 ${textMutedClass}`}>Geotagged with EXIF validation</span>
              </div>
            </div>

            {/* Welcome banner & guidance */}
            <div className={`p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 border ${cardClass}`}>
              <div className="space-y-3 text-left">
                <h3 className="text-xl font-bold">Welcome back, {user.email}!</h3>
                <p className={`text-xs max-w-xl leading-relaxed ${textMutedClass}`}>
                  Start mapping your agricultural properties using the **Boundary Mapper** tool. Once mapped, admins verify the boundary coordinates. When approved, you can catalog single plants to increase carbon ledger biomass estimates.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('mapper')}
                className="px-6 py-3 gradient-btn text-black font-extrabold rounded-2xl text-xs transition whitespace-nowrap"
              >
                Map New Boundary
              </button>
            </div>

            {/* Quick overview table */}
            <div className={`rounded-3xl p-6 border ${cardClass}`}>
              <h3 className={`font-bold text-sm mb-4 uppercase tracking-wider text-[10px] ${textMutedClass}`}>Your Properties Summary</h3>
              {farms.length === 0 ? (
                <div className={`text-center py-8 text-xs font-semibold ${textMutedClass}`}>No lands registered yet. Use the sidebar menu to submit land boundaries.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b border-slate-800 font-bold ${textMutedClass}`}>
                        <th className="pb-3">Farm ID</th>
                        <th className="pb-3">Area (Acres)</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Verification</th>
                        <th className="pb-3">Lease Contract</th>
                        <th className="pb-3">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farms.slice(0, 5).map(f => (
                        <tr key={f.id} className="border-b border-slate-850/20 hover:bg-slate-500/5">
                          <td className="py-3 font-mono font-bold">SB-FARM-{f.id}</td>
                          <td className="py-3">{f.total_area_acres} ac</td>
                          <td className="py-3 capitalize">{f.type.replace('_', ' ')}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              f.status === 'verified' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                              f.status === 'rejected' ? 'bg-red-950 text-red-400 border border-red-800/40' : 'bg-orange-950 text-orange-400 border border-orange-800/40'
                            }`}>
                              {f.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {f.lease_id ? (
                              <span className="text-[11px] font-semibold text-emerald-500">
                                Active
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">—</span>
                            )}
                          </td>
                          <td className={`py-3 ${textMutedClass}`}>{new Date(f.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BOUNDARY MAPPER */}
        {activeTab === 'mapper' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black">Boundary Mapper</h2>
              <p className={`text-xs mt-1 ${textMutedClass}`}>Register new land assets with real-time mapping controls.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Mapper Card */}
              <div className={`md:col-span-2 rounded-3xl p-6 border relative overflow-hidden h-fit ${cardClass}`}>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
                  </svg>
                  Map Coordinates & Perimeter
                </h2>
                
                {farmMessage.text && (
                  <div className={`mb-4 p-4 rounded-xl text-xs border ${
                    farmMessage.type === 'success' ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-200' : 'bg-orange-950/50 border-orange-800/60 text-orange-200'
                  }`}>
                    {farmMessage.text}
                  </div>
                )}

                {!mappingActive ? (
                  <div className="space-y-4">
                    <p className={`text-xs leading-relaxed ${textMutedClass}`}>
                      Provide the land specifications and then open the boundary mapper.
                    </p>
                    
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Farm Name *</label>
                      <input 
                        type="text" required placeholder="e.g. Green Valley Farm"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Registration Type</label>
                        <select 
                          value={mapType} 
                          onChange={(e) => setMapType(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                        >
                          <option value="management_support">Marketing / Support</option>
                          <option value="leased_to_platform">Lease to Platform</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Farming Type *</label>
                        <select 
                          value={farmingType} 
                          onChange={(e) => setFarmingType(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2.5 text-xs outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                        >
                          <option value="hydroponics">Hydroponics</option>
                          <option value="organic">Organic</option>
                          <option value="zbnf">ZBNF</option>
                          <option value="agroforest">Agroforestry</option>
                        </select>
                      </div>
                    </div>

                    {mapType === 'leased_to_platform' && (
                      <div className="p-3 border rounded-xl flex flex-col gap-2 bg-emerald-500/5 border-emerald-500/10">
                        <label className={`block text-xs font-bold uppercase tracking-wider ${textMutedClass}`}>Lease Duration (Years)</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number" min="3" max="99"
                            value={leaseYears}
                            onChange={(e) => setLeaseYears(e.target.value)}
                            className={`w-24 rounded-xl px-3 py-2 text-xs outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-3 space-y-3 pt-1 border-t border-slate-800/40">
                      <h3 className="text-xs font-bold text-slate-400">Land Details</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Soil Type *</label>
                          <input 
                            type="text" placeholder="e.g. Clay, Sandy, Loamy"
                            value={soilType}
                            onChange={(e) => setSoilType(e.target.value)}
                            className={`w-full rounded-xl px-3 py-2 text-xs outline-none border ${inputClass}`}
                            required
                          />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Water Source *</label>
                          <input 
                            type="text" placeholder="e.g. Borewell, River"
                            value={waterSource}
                            onChange={(e) => setWaterSource(e.target.value)}
                            className={`w-full rounded-xl px-3 py-2 text-xs outline-none border ${inputClass}`}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Irrigation System *</label>
                          <select 
                            value={irrigationSystem} 
                            onChange={(e) => setIrrigationSystem(e.target.value)}
                            className={`w-full rounded-xl px-3 py-2 text-xs outline-none border ${inputClass}`}
                            required
                          >
                            <option value="none">None</option>
                            <option value="drip">Drip Irrigation</option>
                            <option value="sprinkler">Sprinkler</option>
                          </select>
                        </div>
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Crop Insurance *</label>
                          <select 
                            value={cropInsurance} 
                            onChange={(e) => setCropInsurance(e.target.value)}
                            className={`w-full rounded-xl px-3 py-2 text-xs outline-none border ${inputClass}`}
                            required
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Land Documents (Required, Multiple allowed, PDF/Image max 10MB each) *</label>
                        <input 
                          type="file" 
                          multiple
                          required
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          onChange={(e) => setDocumentFiles(Array.from(e.target.files))}
                          className={`w-full rounded-xl px-3 py-2 text-xs outline-none border ${inputClass}`}
                        />
                        {documentFiles.length > 0 && (
                          <div className="mt-2 text-[10px] font-bold text-emerald-500">
                            {documentFiles.length} file(s) selected
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${textMutedClass}`}>Preferred Visit Slot *</label>
                        <input 
                          type="date"
                          value={visitSlot} 
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const dateValue = e.target.value;
                            if (dateValue) {
                              const dateObj = new Date(dateValue);
                              const day = dateObj.getUTCDay();
                              if (day !== 0 && day !== 6) {
                                alert("Only Saturday and Sunday are available for visits.");
                                setVisitSlot('');
                                return;
                              }
                            }
                            setVisitSlot(dateValue);
                          }}
                          className={`w-full rounded-xl px-3 py-2 text-xs outline-none border ${inputClass}`}
                          required
                        />
                        <p className={`text-[9px] mt-1 ${textMutedClass}`}>Select a Saturday or Sunday (₹500 deposit required later).</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (!farmName.trim()) {
                          alert("Please provide a Farm Name first.");
                          return;
                        }
                        if (!soilType.trim()) {
                          alert("Please provide the Soil Type.");
                          return;
                        }
                        if (!waterSource.trim()) {
                          alert("Please provide the Water Source.");
                          return;
                        }
                        if (mapType === 'leased_to_platform') {
                          const years = parseInt(leaseYears);
                          if (isNaN(years) || years < 3) {
                            alert("Lease Duration must be a number and at least 3 years.");
                            return;
                          }
                        }
                        startMapping();
                      }}
                      className="w-full py-3 gradient-btn text-black font-extrabold rounded-2xl transition text-sm cursor-pointer"
                    >
                      Start Boundary Walk / Map
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* The Leaflet Map container with recenter */}
                    <div className="h-[350px] w-full rounded-2xl overflow-hidden border border-slate-800 relative z-0">
                      <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%', background: '#090d16' }}>
                        <ChangeView center={mapCenter} zoom={mapZoom} />
                        <TileLayer
                          attribution='&copy; CARTO'
                          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />
                        <MapEventsHandler onMapClick={handleMapClick} />
                        {trackedCoords.map((coord, idx) => (
                          <Marker key={idx} position={[coord[1], coord[0]]} />
                        ))}
                        {trackedCoords.length >= 2 && (
                          <Polygon 
                            positions={trackedCoords.map(c => [c[1], c[0]])} 
                            pathOptions={{ fillColor: '#10b981', color: '#10b981', weight: 2, fillOpacity: 0.2 }}
                          />
                        )}
                        
                        {/* google-maps style pulsing current location point */}
                        {currentGpsPos && (
                          <CircleMarker 
                            center={currentGpsPos}
                            radius={8}
                            pathOptions={{ fillColor: '#3b82f6', color: '#ffffff', weight: 2, fillOpacity: 0.8 }}
                          >
                            <Popup>You are here</Popup>
                          </CircleMarker>
                        )}
                      </MapContainer>
                      
                      {/* Recenter Button overlay */}
                      <button
                        type="button"
                        onClick={recenterMap}
                        className="absolute bottom-4 right-4 z-[1000] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Recenter Map
                      </button>

                      {/* Back Button overlay in map */}
                      <button
                        type="button"
                        onClick={() => {
                          if (watchIdRef.current !== null) {
                            navigator.geolocation.clearWatch(watchIdRef.current);
                            watchIdRef.current = null;
                          }
                          setMappingActive(false);
                          setTrackedCoords([]);
                        }}
                        className="absolute top-4 left-4 z-[1000] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                      >
                        &larr; Back
                      </button>
                    </div>

                    <div className={`text-[10px] text-center ${textMutedClass}`}>
                      Tap/click on the map to add boundary corners manually, or walk to capture them.
                    </div>

                    <div className={`p-4 border rounded-2xl flex flex-col gap-2 text-xs ${innerCardClass}`}>
                      <div className="flex justify-between items-center">
                        <span className={`${textMutedClass} font-semibold`}>Captured Points:</span>
                        <span className="font-mono text-emerald-400 font-bold">{trackedCoords.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`${textMutedClass} font-semibold`}>GPS Accuracy:</span>
                        <span className={`font-mono font-bold ${gpsAccuracy <= 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {gpsAccuracy ? `${gpsAccuracy.toFixed(1)}m` : 'Finding GPS...'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`${textMutedClass} font-semibold`}>Est. Perimeter:</span>
                        <span className="font-mono">{calculatedPerimeter.toFixed(1)} m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`${textMutedClass} font-semibold`}>Est. Area:</span>
                        <span className="font-mono text-emerald-400 font-bold">{calculatedAcres.toFixed(3)} Acres</span>
                      </div>
                    </div>

                    {gpsAccuracy > 5 && (
                      <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-[11px] text-red-200">
                        GPS accuracy weak ({gpsAccuracy.toFixed(1)}m). Feel free to click corners manually to map boundaries accurately.
                      </div>
                    )}

                    <div className="animate-pulse flex items-center justify-center gap-2 text-xs text-orange-400 py-1 font-bold">
                      <span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
                      Active Boundary Mapping Mode...
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={stopMapping}
                        className="flex-grow py-3 gradient-btn text-black font-extrabold rounded-2xl transition text-sm cursor-pointer"
                      >
                        Finish & Save Boundary
                      </button>
                      <button 
                        onClick={() => {
                          setTrackedCoords((prev) => {
                            if (prev.length === 0) return prev;
                            const newPath = prev.slice(0, -1);
                            if (newPath.length >= 2) {
                              let totalDist = 0;
                              for (let i = 0; i < newPath.length - 1; i++) {
                                totalDist += getDistanceMeters(newPath[i][1], newPath[i][0], newPath[i + 1][1], newPath[i + 1][0]);
                              }
                              setCalculatedPerimeter(totalDist);
                            } else {
                              setCalculatedPerimeter(0);
                            }
                            if (newPath.length >= 3) {
                              const sqMeters = calculatePolygonAreaSqMeters(newPath);
                              const acres = sqMeters / 4046.86;
                              setCalculatedAcres(acres);
                            } else {
                              setCalculatedAcres(0);
                            }
                            return newPath;
                          });
                        }}
                        type="button"
                        className={`px-4 py-3 border hover:bg-slate-500/10 font-semibold rounded-2xl transition text-xs cursor-pointer ${inputClass}`}
                      >
                        Undo
                      </button>
                      <button 
                        onClick={() => {
                          if (watchIdRef.current !== null) {
                            navigator.geolocation.clearWatch(watchIdRef.current);
                            watchIdRef.current = null;
                          }
                          setMappingActive(false);
                          setTrackedCoords([]);
                          setCalculatedAcres(0);
                          setCalculatedPerimeter(0);
                        }}
                        type="button"
                        className={`px-4 py-3 border hover:bg-slate-500/10 font-semibold rounded-2xl transition text-xs cursor-pointer ${inputClass}`}
                      >
                        Back
                      </button>
                      <button 
                        onClick={() => {
                          setTrackedCoords([]);
                          setCalculatedAcres(0);
                          setCalculatedPerimeter(0);
                        }}
                        type="button"
                        className={`px-4 py-3 border hover:bg-slate-500/10 font-semibold rounded-2xl transition text-xs cursor-pointer ${inputClass}`}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cache Buffer Card */}
              <div className={`rounded-3xl p-6 border h-fit ${cardClass}`}>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-9.707a1 1 0 011.414 0L9 8.586V3a1 1 0 112 0v5.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Offline Buffer
                </h2>
                <p className={`text-xs mb-4 ${textMutedClass}`}>
                  Saved boundary mappings recorded without active cellular network signal.
                </p>
                {offlineFarms.length === 0 ? (
                  <div className={`text-center py-6 border border-dashed rounded-2xl text-[10px] font-semibold ${innerCardClass} ${textMutedClass}`}>
                    No offline records cached
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {offlineFarms.map((item, idx) => (
                        <div key={item.id} className={`p-3 border rounded-xl text-xs flex justify-between items-center ${innerCardClass}`}>
                          <div>
                            <span className="font-bold capitalize text-[11px]">{item.type.replace('_', ' ')}</span>
                            <div className={`text-[9px] mt-0.5 ${textMutedClass}`}>{item.total_area_acres} ac &bull; {item.raw_coords.length} pts</div>
                          </div>
                          <button 
                            onClick={async () => {
                              await deleteOfflineFarm(item.id);
                              loadOfflineCache();
                            }}
                            className="text-red-400 hover:text-red-300 font-bold px-1 text-[10px]"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={syncOfflineData}
                      disabled={syncing}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl transition text-xs disabled:opacity-50 cursor-pointer"
                    >
                      {syncing ? 'Syncing...' : `Sync ${offlineFarms.length} Farm(s)`}
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: REGISTERED LANDS */}
        {activeTab === 'lands' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black">Your Registered Lands</h2>
              <p className={`text-xs mt-1 ${textMutedClass}`}>Review the list and status of your submitted boundaries.</p>
            </div>

            {loading ? (
              <div className="text-center py-12 text-sm">Loading lands...</div>
            ) : farms.length === 0 ? (
              <div className={`text-center py-16 border border-dashed rounded-3xl text-sm font-semibold ${cardClass} ${textMutedClass}`}>
                No lands registered yet. Use the mapper to register your first farm.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {farms.map((farm) => (
                  <div 
                    key={farm.id}
                    className={`p-5 rounded-3xl border flex flex-col justify-between hover:border-slate-500 transition-colors duration-200 ${cardClass}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm capitalize">{farm.name || farm.type.replace('_', ' ')} (ID: {farm.id})</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        farm.status === 'verified' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                        farm.status === 'rejected' ? 'bg-red-950 text-red-400 border border-red-800/40' : 'bg-orange-950 text-orange-400 border border-orange-800/40'
                      }`}>
                        {farm.status}
                      </span>
                    </div>

                    <div className={`my-6 space-y-2 text-xs border-y py-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <div className="flex justify-between">
                        <span className={textMutedClass}>Property Code:</span>
                        <strong className="font-mono">SB-FARM-{farm.id}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className={textMutedClass}>Area Size:</span>
                        <strong className="text-emerald-400">{farm.total_area_acres} Acres</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className={textMutedClass}>Logged Date:</span>
                        <span className={`font-mono text-[10px] ${textMutedClass}`}>{new Date(farm.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {farm.lease_id && (
                      <div className={`mb-4 p-3.5 rounded-2xl border text-xs leading-relaxed ${
                        isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-100' : 'bg-emerald-50/70 border-emerald-200 text-slate-900'
                      }`}>
                        <span className="font-bold text-emerald-600 block mb-1 text-[11px]">Active Lease Contract</span>
                        <div className="flex justify-between text-[10px]">
                          <span className={textMutedClass}>Contract ID:</span>
                          <span className="font-mono font-bold">SB-LEASE-{farm.lease_id}</span>
                        </div>
                        <div className="flex justify-between text-[10px] mt-0.5">
                          <span className={textMutedClass}>Term Duration:</span>
                          <span className="font-mono text-[9px]">{farm.lease_start} to {farm.lease_end}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedFarm(farm);
                        setActiveTab('plants');
                      }}
                      className={`w-full py-2 border text-xs font-semibold rounded-xl transition-colors duration-200 cursor-pointer ${inputClass}`}
                    >
                      View Plants / Catalog
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PLANT CATALOG */}
        {activeTab === 'plants' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black">Plant Catalog</h2>
              <p className={`text-xs mt-1 ${textMutedClass}`}>Register trees and inspect photo verifications.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form card */}
              <div className={`rounded-3xl p-6 border h-fit ${cardClass}`}>
                <h3 className="text-sm font-bold mb-4">Register New Tree</h3>
                
                {/* Select Farm Dropdown */}
                <div className="mb-4 text-xs">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${textMutedClass}`}>Select Farm Location</label>
                  <select
                    value={selectedFarm ? selectedFarm.id : ''}
                    onChange={(e) => {
                      const farmObj = farms.find(f => f.id === parseInt(e.target.value));
                      setSelectedFarm(farmObj || null);
                      setPlantMessage({ type: '', text: '' });
                      if (farmObj && farmObj.boundary_polygon) {
                        const coords = parseWKT(farmObj.boundary_polygon);
                        if (coords.length > 0) {
                          let latSum = 0, lngSum = 0;
                          coords.forEach(pt => {
                            latSum += pt[0];
                            lngSum += pt[1];
                          });
                          setMapCenter([latSum / coords.length, lngSum / coords.length]);
                          setMapZoom(16);
                        }
                      }
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                  >
                    <option value="">-- Choose Farm --</option>
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name || 'Unnamed Farm'} (ID: SB-FARM-{f.id}) - {f.total_area_acres} ac &bull; {f.status}
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedFarm ? (
                  <div className={`text-center py-6 text-xs font-semibold ${textMutedClass}`}>
                    Please select a farm from the list to enable tree mapping.
                  </div>
                ) : (
                  <form onSubmit={handlePlantSubmit} className="space-y-4 text-xs">
                    {plantMessage.text && (
                      <div className={`p-3 rounded-xl text-[11px] border ${
                        plantMessage.type === 'success' 
                          ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300' 
                          : 'bg-red-950/50 border-red-800/60 text-red-200'
                      }`}>
                        {plantMessage.text}
                      </div>
                    )}

                    <div>
                      <label className={`block text-[10px] font-bold uppercase mb-2 ${textMutedClass}`}>Species</label>
                      <select
                        value={plantSpecies}
                        onChange={(e) => setPlantSpecies(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:border-emerald-500 transition-colors ${inputClass}`}
                      >
                        <option value="Teak">Teak</option>
                        <option value="Mango">Mango</option>
                        <option value="Bamboo">Bamboo</option>
                        <option value="Cashew">Cashew</option>
                        <option value="Agarwood">Agarwood</option>
                        <option value="Other">Other</option>
                      </select>
                      {plantSpecies === 'Other' && (
                        <input
                          type="text"
                          placeholder="Enter species name..."
                          value={customSpecies}
                          onChange={(e) => setCustomSpecies(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 text-xs outline-none border focus:border-emerald-500 transition-colors mt-2 ${inputClass}`}
                          required
                        />
                      )}
                    </div>
                    
                    <div>
                      <label className={`block text-[10px] font-bold uppercase mb-2 ${textMutedClass}`}>Select / Snap Photo *</label>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/jpeg, image/jpg, image/png" 
                        required
                        onChange={handlePhotoCapture}
                        className={`w-full p-2.5 rounded-xl cursor-pointer border ${inputClass}`}
                      />
                      <p className={`text-[9px] mt-1 ${textMutedClass}`}>JPG, JPEG or PNG formats. GPS matches automatically if available.</p>
                    </div>

                    {plantCoordinates && (
                      <div className={`text-[10px] font-mono text-center p-2 rounded-xl border ${innerCardClass}`}>
                        GPS coords: {plantCoordinates.lat.toFixed(5)}, {plantCoordinates.lng.toFixed(5)}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={plantLoading}
                      className="w-full py-3 gradient-btn text-black font-extrabold rounded-xl transition disabled:opacity-50 cursor-pointer"
                    >
                      {plantLoading ? 'Uploading & Processing...' : 'Upload Sapling'}
                    </button>
                  </form>
                )}
              </div>

              {/* Cataloged Trees & Map */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Visual Map Area */}
                {selectedFarm && (
                  <div className={`rounded-3xl border overflow-hidden h-[300px] flex-shrink-0 z-0 relative ${cardClass}`}>
                    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%', background: isDark ? '#090d16' : '#f8fafc' }}>
                      <ChangeView center={mapCenter} zoom={mapZoom} />
                      <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                      
                      {/* Farm Polygon */}
                      {parseWKT(selectedFarm.boundary_polygon).length > 0 && (
                        <Polygon 
                          positions={parseWKT(selectedFarm.boundary_polygon).map(c => [c[0], c[1]])} 
                          pathOptions={{ fillColor: '#10b981', color: '#10b981', weight: 2, fillOpacity: 0.2 }}
                        />
                      )}

                      {/* Plant Markers */}
                      {plants.map(p => {
                        if (p.gps_lat && p.gps_lng) {
                          return (
                            <Marker key={`plant-${p.id}`} position={[parseFloat(p.gps_lat), parseFloat(p.gps_lng)]}>
                              <Popup>
                                <div className="text-center font-bold">
                                  <div>SB-TREE-{p.id}</div>
                                  <div className="capitalize text-emerald-600">{p.species}</div>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        }
                        return null;
                      })}
                    </MapContainer>
                  </div>
                )}

                <div className={`rounded-3xl p-6 border flex flex-col h-[600px] ${cardClass}`}>
                  <h3 className="text-sm font-bold mb-4 flex items-center justify-between">
                    <span>Cataloged Trees</span>
                    {plants.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">
                        Total: {plants.length}
                      </span>
                    )}
                  </h3>
                  
                  {!selectedFarm ? (
                    <div className={`text-center font-semibold my-auto text-xs ${textMutedClass}`}>
                      Choose a farm in the left form to inspect mapped trees.
                    </div>
                  ) : plants.length === 0 ? (
                    <div className={`text-center font-semibold my-auto text-xs ${textMutedClass}`}>
                      No trees cataloged on {selectedFarm.name || 'this farm'} (ID: SB-FARM-{selectedFarm.id}) yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-1 flex-grow custom-scrollbar">
                    {plants.map((plant) => (
                      <div key={plant.id} className={`border rounded-2xl p-3 flex flex-col sm:flex-row gap-4 ${innerCardClass}`}>
                        <img 
                          src={plant.photo_url} 
                          alt={plant.species} 
                          onClick={() => setSelectedPlant(plant)}
                          className="w-20 h-20 object-cover rounded-xl bg-slate-900 self-center cursor-pointer hover:opacity-80 transition-opacity"
                        />
                        <div className="text-xs flex flex-col justify-between flex-grow">
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="font-bold capitalize text-sm">{plant.species}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                plant.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                                plant.status === 'rejected' ? 'bg-red-950 text-red-400 border border-red-800/40' : 'bg-orange-950 text-orange-400 border border-orange-800/40'
                              }`}>
                                {plant.status}
                              </span>
                            </div>
                            <div className={`text-[10px] font-mono mt-1 ${textMutedClass}`}>
                              Plant ID: SB-TREE-{plant.id} on {selectedFarm ? (selectedFarm.name || 'Unnamed Farm') : 'N/A'} (ID: {plant.farm_id})
                            </div>
                          </div>
                          

                        </div>
                      </div>
                    ))}
                  </div>
                  )}
            </div>
          </div>
        </div>
        </div>
        )}

        {/* TAB 5: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="max-w-5xl mx-auto animate-fadeIn">
            <ProductsPage token={token} />
          </div>
        )}

        {/* TAB 6: RENTALS */}
        {activeTab === 'rentals' && (
          <div className="max-w-5xl mx-auto animate-fadeIn">
            <RentalsPage token={token} />
          </div>
        )}

        {/* TAB 7: BULK ORDERS */}
        {activeTab === 'bulk' && (
          <div className="max-w-5xl mx-auto animate-fadeIn">
            <BulkOrdersPage token={token} />
          </div>
        )}

        {/* TAB 8: MY ORDERS */}
        {activeTab === 'orders' && (
          <div className="max-w-5xl mx-auto animate-fadeIn">
            <MyOrders token={token} />
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
      </div>
  
  );
}

