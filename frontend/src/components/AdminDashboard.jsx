import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
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

// Helper to parse WKT POLYGON((...)) to Leaflet LatLng array [ [lat, lng], ... ]
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

export default function AdminDashboard() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFarms = async () => {
    try {
      const res = await fetch('api/admin/farms.php');
      const data = await res.json();
      if (data.farms) {
        setFarms(data.farms);
      }
    } catch (err) {
      console.error("Error fetching farms", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const acceptFarm = async (id) => {
    try {
      const res = await fetch('api/admin/farms.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'accepted' })
      });
      const data = await res.json();
      if (data.success) {
        fetchFarms();
      }
    } catch (err) {
      console.error("Error updating farm", err);
    }
  };

  if (loading) return <div className="p-10 text-center text-xl">Loading Map...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow px-8 py-4 flex justify-between items-center z-10">
        <h1 className="text-2xl font-bold text-gray-800">Sahasra Bharat - Admin Dashboard</h1>
        <div className="flex gap-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="w-4 h-4 bg-orange-500 rounded-full inline-block"></span> Pending
          </span>
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="w-4 h-4 bg-green-500 rounded-full inline-block"></span> Accepted
          </span>
        </div>
      </header>

      <main className="flex-grow p-6 relative">
        <div className="h-full w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 relative z-0">
          <MapContainer center={[20, 78]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {farms.map((farm) => {
              const positions = parseWKT(farm.boundary_polygon);
              const isPending = farm.status === 'pending';
              const color = isPending ? '#f97316' : '#22c55e'; // orange-500 or green-500

              const popupContent = (
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-lg">{farm.farm_name}</h3>
                  <p className="text-xs text-gray-500 font-mono mb-1">ID: {farm.farmer_id}</p>
                  <p className="text-sm font-semibold mb-1">{farm.farmer_name}</p>
                  <p className="text-sm text-gray-600 mb-2"><a href={`mailto:${farm.email}`} className="text-blue-600 hover:underline">{farm.email}</a></p>
                  {farm.address && <p className="text-xs text-gray-600 mb-2 border-l-2 pl-2 border-gray-300">{farm.address}</p>}
                  <p className="text-sm capitalize mb-3">
                    Status: <span className={isPending ? 'text-orange-600 font-semibold' : 'text-green-600 font-semibold'}>{farm.status}</span>
                  </p>
                  {isPending && (
                    <button 
                      onClick={() => acceptFarm(farm.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                      Accept Farm
                    </button>
                  )}
                </div>
              );

              // Render polygon if present
              if (positions.length > 0) {
                return (
                  <Polygon 
                    key={farm.id} 
                    positions={positions} 
                    pathOptions={{ fillColor: color, color: color, weight: 2, fillOpacity: 0.5 }}
                  >
                    <Popup>{popupContent}</Popup>
                  </Polygon>
                );
              }

              // Otherwise render marker if lat/lng are present
              if (farm.latitude && farm.longitude) {
                return (
                  <Marker key={farm.id} position={[farm.latitude, farm.longitude]}>
                    <Popup>{popupContent}</Popup>
                  </Marker>
                );
              }

              return null;
            })}
          </MapContainer>
        </div>
      </main>
    </div>
  );
}

