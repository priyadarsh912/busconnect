import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Users, Bus, AlertTriangle, ShieldCheck, Phone, MapPin, Search } from "lucide-react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Leaflet + bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Safely modify the icon prototype
const DefaultIcon = L.Icon?.Default;
if (DefaultIcon) {
  delete (DefaultIcon.prototype as any)._getIconUrl;
  DefaultIcon.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
  });
}

const CITY_COORDS: Record<string, [number, number]> = {
  // Chandigarh Tricity mocked nodes
  "Chandigarh": [30.7333, 76.7794],
  "Mohali": [30.7046, 76.7179],
  "Zirakpur": [30.6425, 76.8173],
  "Sector 17": [30.7398, 76.7827],
  "Sector 43 Bus Stand": [30.7250, 76.7460],
  "Phase 3": [30.7186, 76.7145],
  "Phase 5": [30.7214, 76.7267],
};

const AdminBusTrackingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bus } = location.state || {}; // Expecting LiveBus interface from dashboard

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Defaults if navigated directly without state
  const fromCity = bus?.from || "Sector 17";
  const toCity = bus?.to || "Phase 5";

  const fromCoords = CITY_COORDS[fromCity] || CITY_COORDS["Sector 17"];
  const toCoords = CITY_COORDS[toCity] || CITY_COORDS["Phase 5"];

  useEffect(() => {
    if (!mapContainer.current) return;

    if (mapContainer.current && (mapContainer.current as any)._leaflet_id) {
      (mapContainer.current as any)._leaflet_id = null;
    }

    const map = L.map(mapContainer.current).setView(fromCoords, 13);

    // Fix for mobile rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Draw route line
    const routeLine = L.polyline([fromCoords, toCoords], {
      color: "hsl(224, 76%, 55%)",
      weight: 5,
    }).addTo(map);

    L.marker(fromCoords).addTo(map).bindTooltip(`From: ${fromCity}`, { permanent: true });
    L.marker(toCoords).addTo(map).bindTooltip(`To: ${toCity}`);

    // Mock bus position somewhat along the route
    const latDiff = (toCoords[0] - fromCoords[0]);
    const lonDiff = (toCoords[1] - fromCoords[1]);

    // Position depends on mocked occupancy/randomness
    const progress = Math.max(0.2, (bus?.occupancy || 50) / 100);
    const busPos: [number, number] = [fromCoords[0] + latDiff * progress, fromCoords[1] + lonDiff * progress];

    const busIcon = L.divIcon({
      html: "🚌",
      className: "text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] bg-transparent leading-none flex items-center justify-center -mt-2",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker(busPos, { icon: busIcon }).addTo(map).bindTooltip("Live Location").openTooltip();

    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

    return () => {
      map.remove();
    };
  }, [bus, fromCity, toCity, fromCoords, toCoords]);

  return (
    <div className="min-h-screen bg-muted/30 pb-10 flex flex-col">
      {/* Header */}
      <div className="bg-card px-4 pt-6 pb-4 border-b flex items-center gap-4 sticky top-0 z-20 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 bg-muted rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold leading-tight">Admin Tracking</h1>
          <p className="text-xs text-muted-foreground font-medium">{bus?.routeNo || 'Route Overview'} • ID: {bus?.id || 'Tracking All'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map Container */}
        <div className="w-full h-72 bg-secondary relative shadow-inner z-0 border-b border-border">
          <div ref={mapContainer} className="absolute inset-0 z-0" />

          <div className="absolute top-4 right-4 z-[400] bg-card p-2 rounded-lg shadow-lg border border-border flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Feed
            </div>
          </div>
        </div>

        {/* Administration Data Panels */}
        <div className="px-4 py-6 space-y-4">

          {/* Status Alert (If delayed or warning) */}
          {bus?.status !== "On Time" && (
            <div className={`p-4 rounded-xl flex items-start gap-3 border ${bus?.status === 'Warning' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200' : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50 text-yellow-900 dark:text-yellow-200'}`}>
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${bus?.status === 'Warning' ? 'text-red-500' : 'text-yellow-600'}`} />
              <div>
                <h4 className="font-bold text-sm">Status: {bus?.status}</h4>
                <p className="text-xs mt-1 opacity-90">{bus?.status === 'Warning' ? 'Bus is significantly off-route or experiencing mechanical issues.' : 'Bus is trailing schedule by approximately 15 minutes due to traffic.'}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Crowd Info */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Occupancy</p>
              <h3 className="text-2xl font-black">{bus?.occupancy || 0}%</h3>
              <div className="w-full h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${((bus?.occupancy || 0) > 80) ? 'bg-red-500' : ((bus?.occupancy || 0) > 60) ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${bus?.occupancy || 0}%` }} />
              </div>
            </div>

            {/* Driver Info */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Driver Staff</p>
              <h3 className="text-lg font-bold truncate">{bus?.driverName || "Driver Not Assigned"}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-primary">{bus?.driverPhone || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="font-bold text-sm border-b border-border/50 pb-2">Location Log</h3>
            <div className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">{toCity}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Estimated Arrival • 12 mins away</p>
              </div>
            </div>
            <div className="flex items-start gap-4 opacity-50 relative">
              <div className="absolute -top-4 left-3 w-px h-4 bg-border" />
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold">{fromCity}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Departed • 28 mins ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBusTrackingPage;
