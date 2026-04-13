import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Info,
  MapPin,
  Clock,
  Bus,
  Zap,
} from "lucide-react";
import CrowdBadge from "@/components/CrowdBadge";
import { useCrowdPrediction } from "@/hooks/useCrowdPrediction";
import { MostUsedRoutes } from "@/components/MostUsedRoutes";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/lib/language";

// Fix for default marker icon in Leaflet + bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { validateStops } from "@/utils/corridorUtils";
import { authService } from "../services/authService";
import { busService } from "../services/busService";
import { analyticsService } from "../services/AnalyticsService";

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

type Stop = {
  name: string;
  scheduledTime: string;
  expectedTime: string;
  distance: string;
  progressAnchor: number;
  isStart?: boolean;
  isTerminal?: boolean;
};

const TrackingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [activeRoute, setActiveRoute] = useState<any>(location.state?.route || null);
  const [activeTripType, setActiveTripType] = useState<string>(location.state?.tripType || "");

  const { predict: predictCrowd } = useCrowdPrediction();

  const from = activeTripType === "intercity" ? (activeRoute?.from_stop || "Sector 17") : (activeRoute?.start_stop || activeRoute?.start_city || "");
  const to = activeTripType === "intercity" ? (activeRoute?.to_stop || "Phase 5") : (activeRoute?.end_stop || activeRoute?.end_city || "");

  const rawViaStop = activeTripType === "intercity" ? (activeRoute?.stop || "") : (activeRoute?.stop_1 || activeRoute?.stop_city || "");
  const rawViaStop2 = activeTripType === "outstation" ? (activeRoute?.stop_2 || "") : "";

  // Validate intermediate stops based on predefined corridors to avoid impossible geography
  const validatedStops = validateStops(from, to, [rawViaStop, rawViaStop2]);
  const viaStop = validatedStops.length > 0 ? validatedStops[0] : "";
  const viaStop2 = validatedStops.length > 1 ? validatedStops[1] : "";

  // Initial timeline placeholder to avoid empty box
  useEffect(() => {
    if (from && to) {
      const now = new Date();
      const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const placeholders: Stop[] = [
        { name: `${from}`, scheduledTime: formatTime(now), expectedTime: formatTime(now), distance: "0 km", progressAnchor: 0, isStart: true },
        { name: `${to}`, scheduledTime: formatTime(new Date(now.getTime() + 45 * 60000)), expectedTime: formatTime(new Date(now.getTime() + 45 * 60000)), distance: "--- km", progressAnchor: 100, isTerminal: true },
      ];
      if (viaStop) {
        placeholders.splice(1, 0, { name: viaStop, scheduledTime: formatTime(new Date(now.getTime() + 20 * 60000)), expectedTime: formatTime(new Date(now.getTime() + 20 * 60000)), distance: "--- km", progressAnchor: 50 });
      }
      setDynamicStops(placeholders);
    }
  }, [from, to, viaStop]);

  // Update active route if location state changes (e.g. from MostUsedRoutes click)
  useEffect(() => {
    if (location.state?.route) {
      setActiveRoute(location.state.route);
      setActiveTripType(location.state.tripType || "intercity");
    }
  }, [location.state]);

  // Auto-save: Log tracking interaction to Supabase
  useEffect(() => {
    if (from && to && from !== "Unknown" && to !== "Unknown") {
      const user = authService.getCurrentUser();
      if (user) {
        // Save search history and intent in Supabase
        busService.saveSearchHistory(user.id, from, to, activeTripType || "intercity").catch(() => {});
      }
    }
  }, [from, to]); 

  // Auto-load most used route if none is provided
  useEffect(() => {
    if (!activeRoute) {
      const historyJson = localStorage.getItem('user_route_history');
      if (historyJson) {
        const history = JSON.parse(historyJson);
        if (history.length > 0) {
          const topRoute = history[0];
          setActiveRoute(topRoute.rawRouteData);
          setActiveTripType(topRoute.tripType);
        } else {
           // Fallback to a featured route if no history
           setActiveRoute({
             route_id: 'ch-ph5-1',
             from_stop: 'Sector 17',
             to_stop: 'Phase 5',
             stop: 'Phase 2',
             distance_km: 8.5,
             eta_minutes: 25,
             current_lat: 30.7398,
             current_lon: 76.7827
           });
           setActiveTripType('intercity');
        }
      } else {
          // Absolute fallback for first time users
           setActiveRoute({
             route_id: 'ch-ph5-1',
             from_stop: 'Sector 17',
             to_stop: 'Phase 5',
             stop: 'Phase 2',
             distance_km: 8.5,
             eta_minutes: 25,
             current_lat: 30.7398,
             current_lon: 76.7827
           });
           setActiveTripType('intercity');
      }
    }
  }, [activeRoute]);

  // Track tracking started
  useEffect(() => {
    if (activeRoute) {
        analyticsService.logEvent('tracking_started', { 
            bus_id: activeRoute.route_id, 
            route: `${from} → ${to}` 
        });
    }
  }, [activeRoute?.route_id]);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routingLayer = useRef<L.LayerGroup | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);

  const [distance, setDistance] = useState<string>("Calculating...");
  const [eta, setEta] = useState<string>("...");
  const [etaMinutes, setEtaMinutes] = useState<number>(activeRoute?.eta_minutes || activeRoute?.etaMinutes || 25);
  const [isLoading, setIsLoading] = useState(true);

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [dynamicStops, setDynamicStops] = useState<Stop[]>([]);

  // --- City & Stop Coordinates ---
  const CITY_COORDS: Record<string, [number, number]> = {
    // Chandigarh Tricity
    "Chandigarh": [30.7333, 76.7794],
    "Mohali": [30.7046, 76.7179],
    "Zirakpur": [30.6425, 76.8173],
    "Sector 10": [30.7587, 76.7865],
    "Sector 15": [30.7533, 76.7725],
    "Sector 17": [30.7398, 76.7827],
    "Sector 20": [30.7214, 76.7876],
    "Sector 21": [30.7260, 76.7810],
    "Sector 22": [30.7363, 76.7699],
    "Sector 34": [30.7188, 76.7645],
    "Sector 35": [30.7285, 76.7562],
    "Sector 37": [30.7395, 76.7450],
    "Sector 43 Bus Stand": [30.7250, 76.7460],
    "IT Park": [30.7265, 76.8407],
    "Phase 1": [30.7300, 76.7118],
    "Phase 2": [30.7248, 76.7126],
    "Phase 3": [30.7186, 76.7145],
    "Phase 4": [30.7161, 76.7196],
    "Phase 5": [30.7214, 76.7267],
    "Phase 6": [30.7335, 76.7179],
    "Phase 7": [30.7230, 76.7328],
    "Phase 8": [30.7180, 76.7340],
    "Phase 9": [30.6970, 76.7400],
    "Phase 11": [30.6865, 76.7470],
    "Sunny Enclave": [30.7135, 76.7000],
    "Balongi": [30.7042, 76.7051],
    "Kharar": [30.7483, 76.6414],
    "Landran": [30.6865, 76.6667],
    "Kurali": [30.8222, 76.5744],
    "Sohana": [30.6853, 76.7215],
    "Chhappar Chiri": [30.7032, 76.6715],
    "ISBT 17": [30.7398, 76.7827],
    "ISBT 43": [30.7250, 76.7460],
    "PGI": [30.7670, 76.7770],
    "Cantonment": [30.6900, 76.8500],
    // Punjab cities
    "Ludhiana": [30.9010, 75.8573],
    "Amritsar": [31.6340, 74.8723],
    "Patiala": [30.3398, 76.3869],
    "Jalandhar": [31.3260, 75.5762],
    "Ropar": [30.9664, 76.5331],
    "Bathinda": [30.2110, 74.9455],
    "Moga": [30.8162, 75.1741],
    "Ferozepur": [30.9331, 74.6225],
    "Faridkot": [30.6764, 74.7584],
    "Rajpura": [30.4837, 76.5931],
    "Kapurthala": [31.3797, 75.3822],
    "Nabha": [30.3752, 76.1539],
    "Phagwara": [31.2240, 75.7708],
    "Jagraon": [30.7888, 75.4681],
    "Kotkapura": [30.5848, 74.8328],
    // Haryana cities
    "Ambala": [30.3782, 76.7767],
    "Kurukshetra": [29.9695, 76.8783],
    "Karnal": [29.6857, 76.9905],
    "Panipat": [29.3909, 76.9635],
    "Sonipat": [28.9931, 77.0151],
    "Derabassi": [30.5944, 76.8489],
    "Shahabad": [30.1698, 76.8703],
    "Shambhu": [30.4501, 76.6731],
    "Samalkha": [29.2317, 77.0189],
    "Delhi": [28.6139, 77.2090],
    "Shimla": [31.1048, 77.1734],
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const getCoordinates = async (
    city: string
  ): Promise<[number, number] | null> => {
    if (!city) return null;
    const trimmedCity = city.trim();

    // Cache check with normalization
    const normalizedName = Object.keys(CITY_COORDS).find(
      (k) =>
        k.toLowerCase() === trimmedCity.toLowerCase() ||
        trimmedCity.toLowerCase().includes(k.toLowerCase())
    );

    if (normalizedName) {
      return CITY_COORDS[normalizedName];
    }

    // Robustness for Sector/Phase searches in Chandigarh
    let searchQuery = trimmedCity;
    const isIntercitySector = /^(Sector|Phase|Village|ISBT|IT Park)/i.test(trimmedCity);
    if (isIntercitySector && !trimmedCity.toLowerCase().includes("chandigarh") && !trimmedCity.toLowerCase().includes("mohali")) {
      searchQuery = `Chandigarh ${trimmedCity}`;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=in&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        return [lat, lon];
      }
      return null;
    } catch (err) {
      console.error("Geocoding failed for", city, err);
      return null;
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Fix for React StrictMode: map container is already initialized
    const container = mapContainer.current as any;
    if (container._leaflet_id !== undefined) {
      container._leaflet_id = null;
    }

    // Initialize map with center on live bus position or fallback
    const liveLat = activeRoute?.current_lat || activeRoute?.start_lat;
    const liveLon = activeRoute?.current_lon || activeRoute?.start_lon;
    const initialCenter: [number, number] = liveLat && liveLon
      ? [liveLat, liveLon]
      : activeRoute?.lat_from && activeRoute?.lon_from
        ? [activeRoute.lat_from, activeRoute.lon_from]
        : [30.7333, 76.7794];

    const mapInstance = L.map(container).setView(initialCenter, 14); 
    map.current = mapInstance;
    routingLayer.current = L.layerGroup().addTo(mapInstance);

    // Fix for mobile rendering
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 300);

    // Add Free OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance);

    let isMounted = true;

    // Fetch and draw activeRoute
    const drawRoute = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      // 1. Resolve coordinates for all points
      const fromCoords: [number, number] | null = (activeRoute && activeRoute.start_lat && activeRoute.start_lon) ? [Number(activeRoute.start_lat), Number(activeRoute.start_lon)]
        : (activeRoute && activeRoute.lat_from && activeRoute.lon_from) ? [Number(activeRoute.lat_from), Number(activeRoute.lon_from)]
          : await getCoordinates(from);
      if (!isMounted) return;

      await sleep(1000); // Nominatim rate limit: 1 request/second
      if (!isMounted) return;

      const toCoords: [number, number] | null = (activeRoute && activeRoute.end_lat && activeRoute.end_lon) ? [Number(activeRoute.end_lat), Number(activeRoute.end_lon)]
        : (activeRoute && activeRoute.lat_to && activeRoute.lon_to) ? [Number(activeRoute.lat_to), Number(activeRoute.lon_to)]
          : await getCoordinates(to);
      if (!isMounted) return;

      let stopCoords: [number, number] | null = (activeRoute && activeRoute.lat_stop && activeRoute.lon_stop) ? [Number(activeRoute.lat_stop), Number(activeRoute.lon_stop)] : null;
      if (!stopCoords && viaStop) {
        await sleep(1000);
        if (!isMounted) return;
        stopCoords = await getCoordinates(viaStop);
        if (!isMounted) return;
      }

      let stop2Coords: [number, number] | null = null;
      if (viaStop2) {
        await sleep(1000);
        if (!isMounted) return;
        stop2Coords = await getCoordinates(viaStop2);
        if (!isMounted) return;
      }

      if (fromCoords && toCoords) {
        try {
          // If we have a pre-computed full polyline from Radar, skip OSRM overhead entirely
          if (activeRoute && activeRoute.full_polyline) {
            const coords = activeRoute.full_polyline;
            setRouteCoords(coords);

            const polyline = L.polyline(coords, {
              color: "hsl(224, 76%, 55%)",
              weight: 4,
            }).addTo(routingLayer.current!);

            L.marker(fromCoords)
              .addTo(routingLayer.current!)
              .bindTooltip(`From: ${from}`, { permanent: false });

            if (stopCoords) {
              L.marker(stopCoords)
                .addTo(routingLayer.current!)
                .bindTooltip(`Via: ${viaStop}`, { permanent: false });
            }

            if (stop2Coords) {
              L.marker(stop2Coords)
                .addTo(routingLayer.current!)
                .bindTooltip(`Via: ${viaStop2}`, { permanent: false });
            }

            L.marker(toCoords)
              .addTo(routingLayer.current!)
              .bindTooltip(`To: ${to}`, { permanent: false });

            const busIcon = L.divIcon({
              html: "🚌",
              className: "text-2xl drop-shadow-md bg-transparent leading-none flex items-center justify-center",
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            });

            // If we have current position from radar, use it, else start of line
            const busStartCoords = (activeRoute.current_lat && activeRoute.current_lon)
              ? [activeRoute.current_lat, activeRoute.current_lon] as [number, number]
              : coords[0];

            busMarkerRef.current = L.marker(busStartCoords, { icon: busIcon })
              .addTo(routingLayer.current!)
              .bindTooltip("Live Bus Position")
              .openTooltip();

            // Keep map firmly focused on the bus
            mapInstance.setView(busStartCoords, 14);

            setDistance((activeRoute.distance_km || 10).toFixed(1) + " km");
            setEtaMinutes(activeRoute.etaMinutes || activeRoute.eta_min || 0);
            setEta((activeRoute.etaMinutes || activeRoute.eta_min || 0) + " mins");

            // Set dynamic stops mock
            const now = new Date();
            const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
            const finalStops: Stop[] = [
              { name: `${from} Stop`, scheduledTime: formatTime(now), expectedTime: formatTime(now), distance: "0 km", progressAnchor: 0, isStart: true },
              { name: `${viaStop || 'Intermediate Stop'}`, scheduledTime: formatTime(new Date(now.getTime() + 15 * 60000)), expectedTime: formatTime(new Date(now.getTime() + 15 * 60000)), distance: "5 km", progressAnchor: 50 },
              { name: `${to} Stop`, scheduledTime: formatTime(new Date(now.getTime() + 30 * 60000)), expectedTime: formatTime(new Date(now.getTime() + 30 * 60000)), distance: "10 km", progressAnchor: 100, isTerminal: true },
            ];
            setDynamicStops(finalStops);
            setIsLoading(false);
            return;
          }

          // OSRM expects longitude,latitude
          // Collect all valid points
          const points = [fromCoords];
          if (stopCoords) points.push(stopCoords);
          if (stop2Coords) points.push(stop2Coords);
          points.push(toCoords);

          const waypoints = points.map(c => `${c[1]},${c[0]}`).join(';');

          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=true`,
          );
          if (!isMounted) return;
          const routeData = await res.json();
          if (!isMounted) return;

          if (routeData.code === "Ok" && routeData.routes.length > 0) {
            const osrmRoute = routeData.routes[0];

            // Set Distance & ETA state correctly
            setDistance((osrmRoute.distance / 1000).toFixed(1) + " km");
            const mins = Math.round(osrmRoute.duration / 60);
            setEtaMinutes(mins);
            setEta(mins + " mins");

            // Draw activeRoute on map
            const geoJsonLayer = L.geoJSON(osrmRoute.geometry, {
              style: {
                color: "#2563EB",
                weight: 5,
                opacity: 0.9
              }
            }).addTo(routingLayer.current!);

            // Save coords for bus movement animation
            const coords = osrmRoute.geometry.coordinates;
            // Leaflet expects latitude,longitude
            const latLngs = coords.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number],
            );
            setRouteCoords(latLngs);

            // Add Stop markers
            L.marker(fromCoords)
              .addTo(routingLayer.current!)
              .bindTooltip(`From: ${from}`, { permanent: false });

            if (stopCoords) {
              L.marker(stopCoords)
                .addTo(routingLayer.current!)
                .bindTooltip(`Via: ${viaStop}`, { permanent: false });
            }
            if (stop2Coords) {
              L.marker(stop2Coords)
                .addTo(routingLayer.current!)
                .bindTooltip(`Via: ${viaStop2}`, { permanent: false });
            }

            L.marker(toCoords)
              .addTo(routingLayer.current!)
              .bindTooltip(`To: ${to}`, { permanent: false });

            // Add Bus marker at the beginning
            const busIcon = L.divIcon({
              html: "🚌",
              className:
                "text-2xl drop-shadow-md bg-transparent leading-none flex items-center justify-center",
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            });
            busMarkerRef.current = L.marker(latLngs[0], { icon: busIcon })
              .addTo(routingLayer.current!)
              .bindTooltip("Live Bus Position")
              .openTooltip();

            // Setup dynamic stops from OSRM steps
            const now = new Date();
            const formatTime = (date: Date) =>
              date.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              });

            const legs = osrmRoute.legs || [];
            let accumulatedDistance = 0;
            let accumulatedDuration = 0;
            const intermediateStops: Stop[] = [];

            // Helper to get stop name for a waypoint index
            const getStopNameForLegEnd = (legIndex: number) => {
              if (legIndex === 0 && viaStop) return viaStop;
              if (legIndex === 1 && viaStop2) return viaStop2;
              return null;
            };

            for (let i = 0; i < legs.length; i++) {
              const leg = legs[i];
              const steps = leg.steps || [];

              for (const step of steps) {
                accumulatedDistance += step.distance;
                accumulatedDuration += step.duration;

                // Only add "discovered" steps if we don't have enough stops and it's a long segment
                const nextDiscoveryDistance = osrmRoute.distance / 4;
                const lastStopDistance = intermediateStops.length > 0
                  ? parseFloat(intermediateStops[intermediateStops.length - 1].distance) * 1000
                  : 0;

                if (
                  accumulatedDistance - lastStopDistance >= nextDiscoveryDistance &&
                  intermediateStops.length < 5 &&
                  i === legs.length - 1 
                ) {
                  if (
                    step.name &&
                    step.name.length > 2 &&
                    !step.name.toLowerCase().includes("roundabout") &&
                    !step.name.toLowerCase().includes("turn")
                  ) {
                    const progressPct = (accumulatedDistance / osrmRoute.distance) * 100;
                    const timeAtStop = new Date(now.getTime() + accumulatedDuration * 1000);

                    intermediateStops.push({
                      name: step.name,
                      scheduledTime: formatTime(timeAtStop),
                      expectedTime: formatTime(new Date(timeAtStop.getTime() + 2 * 60000)),
                      distance: (accumulatedDistance / 1000).toFixed(1) + " km",
                      progressAnchor: progressPct,
                    });
                  }
                }
              }

              const waypointName = getStopNameForLegEnd(i);
              if (waypointName && i < legs.length - 1) {
                const progressPct = (accumulatedDistance / osrmRoute.distance) * 100;
                const timeAtStop = new Date(now.getTime() + accumulatedDuration * 1000);

                const alreadyAdded = intermediateStops.some(s => s.name === waypointName);

                if (!alreadyAdded) {
                  intermediateStops.push({
                    name: waypointName,
                    scheduledTime: formatTime(timeAtStop),
                    expectedTime: formatTime(new Date(timeAtStop.getTime() + 2 * 60000)),
                    distance: (accumulatedDistance / 1000).toFixed(1) + " km",
                    progressAnchor: progressPct,
                  });
                }
              }
            }

            const finalStops: Stop[] = [
              {
                name: `${from} Stop`,
                scheduledTime: formatTime(now),
                expectedTime: formatTime(now),
                distance: "0 km",
                progressAnchor: 0,
                isStart: true,
              },
              ...intermediateStops.sort((a, b) => a.progressAnchor - b.progressAnchor),
              {
                name: `${to} Stop`,
                scheduledTime: formatTime(
                  new Date(now.getTime() + osrmRoute.duration * 1000),
                ),
                expectedTime: formatTime(
                  new Date(now.getTime() + osrmRoute.duration * 1000 + 2 * 60000),
                ),
                distance: (osrmRoute.distance / 1000).toFixed(1) + " km",
                progressAnchor: 100,
                isTerminal: true,
              },
            ];

            setDynamicStops(finalStops);

            mapInstance.fitBounds(geoJsonLayer.getBounds(), { padding: [30, 30] });
          } else {
            // FALLBACK DRAWING if OSRM fails
            console.warn("OSRM failed, using straight-line polyline fallback");
            const fallbackPoints: [number, number][] = [fromCoords];
            if (stopCoords) fallbackPoints.push(stopCoords);
            if (stop2Coords) fallbackPoints.push(stop2Coords);
            fallbackPoints.push(toCoords);

            const polyline = L.polyline(fallbackPoints, {
              color: "#3b82f6",
              weight: 5,
              opacity: 0.8,
              dashArray: "10, 10",
            }).addTo(mapInstance);

            mapInstance.fitBounds(polyline.getBounds(), { padding: [30, 30] });
          }
        } catch (err) {
          console.error("Routing failed, falling back to simple polyline", err);
          // Fallback to simple polyline
          const latLngs: [number, number][] = [fromCoords];
          if (stopCoords) latLngs.push(stopCoords);
          if (stop2Coords) latLngs.push(stop2Coords);
          latLngs.push(toCoords);

          setRouteCoords(latLngs);

          const polyline = L.polyline(latLngs, {
            color: "hsl(224, 76%, 55%)",
            weight: 4,
            dashArray: "10, 10" 
          }).addTo(routingLayer.current!);

          L.marker(fromCoords).addTo(routingLayer.current!).bindTooltip(`From: ${from}`);

          if (stopCoords) {
            L.marker(stopCoords).addTo(routingLayer.current!).bindTooltip(`Via: ${viaStop}`);
          }
          if (stop2Coords) {
            L.marker(stop2Coords).addTo(routingLayer.current!).bindTooltip(`Via: ${viaStop2}`);
          }

          L.marker(toCoords).addTo(routingLayer.current!).bindTooltip(`To: ${to}`);

          const busIcon = L.divIcon({
            html: "🚌",
            className: "text-2xl drop-shadow-md bg-transparent leading-none flex items-center justify-center",
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });
          busMarkerRef.current = L.marker(fromCoords, { icon: busIcon })
            .addTo(routingLayer.current!)
            .bindTooltip("Live Bus Position");

          mapInstance.fitBounds(polyline.getBounds(), { padding: [30, 30] });

          const fallbackDistance = activeRoute?.distance_km || 10;
          const fallbackEta = activeRoute?.etaMinutes || 30;
          setDistance(fallbackDistance.toFixed(1) + " km");
          setEtaMinutes(fallbackEta);
          setEta(fallbackEta + " mins");

          const formatTime = (date: Date) =>
            date.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            });
          const now = new Date();
          const fallbackStops: Stop[] = [
            {
              name: `${from} Stop`,
              scheduledTime: formatTime(now),
              expectedTime: formatTime(now),
              distance: "0 km",
              progressAnchor: 0,
              isStart: true,
            },
          ];
          if (viaStop) {
            fallbackStops.push({
              name: viaStop,
              scheduledTime: formatTime(new Date(now.getTime() + 30 * 60000)),
              expectedTime: formatTime(new Date(now.getTime() + 32 * 60000)),
              distance: "--- km",
              progressAnchor: 33,
            });
          }
          if (viaStop2) {
            fallbackStops.push({
              name: viaStop2,
              scheduledTime: formatTime(new Date(now.getTime() + 60 * 60000)),
              expectedTime: formatTime(new Date(now.getTime() + 62 * 60000)),
              distance: "--- km",
              progressAnchor: 66,
            });
          }
          fallbackStops.push({
            name: `${to} Stop`,
            scheduledTime: formatTime(new Date(now.getTime() + 90 * 60000)),
            expectedTime: formatTime(new Date(now.getTime() + 92 * 60000)),
            distance: "--- km",
            progressAnchor: 100,
            isTerminal: true,
          });
          setDynamicStops(fallbackStops);
        }
      }
      setIsLoading(false);
    };

    drawRoute();

    return () => {
      isMounted = false;
      mapInstance.remove();
      map.current = null;
      routingLayer.current = null;
    };
  }, [from, to, viaStop, viaStop2]);

  // Animation & Live Tracking effect
  useEffect(() => {
    if (routeCoords.length === 0 || !busMarkerRef.current || !activeRoute)
      return;

    let unsub: any = null;
    let fallbackInterval: any = null;
    let hasLiveLocation = false;
    let isMounted = true;
    let localUnsub: (() => void) | null = null;

    const setupLiveTracking = async () => {
      try {
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');

        if (!isMounted) return;

        const routeId = activeRoute.bus_id || activeRoute.route_id;
        if (!routeId || !db) return;

        const q = query(
          collection(db, 'bus_locations'),
          where('busId', '==', routeId)
        );

        localUnsub = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty && isMounted) {
            hasLiveLocation = true;
            if (fallbackInterval) {
              clearInterval(fallbackInterval);
              fallbackInterval = null;
            }

            let latestDoc = snapshot.docs[0].data();
            snapshot.docs.forEach(doc => {
              const docData = doc.data();
              const docTime = docData.timestamp?.toMillis?.() || docData.timestamp?.seconds || 0;
              const latestTime = latestDoc.timestamp?.toMillis?.() || latestDoc.timestamp?.seconds || 0;
              
              if (docTime > latestTime) {
                latestDoc = docData;
              }
            });

            const liveLat = latestDoc.lat ?? latestDoc.latitude;
            const liveLng = latestDoc.lng ?? latestDoc.longitude;
            
            if (liveLat != null && liveLng != null && busMarkerRef.current) {
              const newPos: [number, number] = [liveLat, liveLng];
              busMarkerRef.current.setLatLng(newPos);
              
              let closestIdx = 0;
              let minDistance = Infinity;
              
              routeCoords.forEach((coord, i) => {
                const dist = Math.sqrt(
                  Math.pow(coord[0] - liveLat, 2) + 
                  Math.pow(coord[1] - liveLng, 2)
                );
                if (dist < minDistance) {
                  minDistance = dist;
                  closestIdx = i;
                }
              });
              
              const totalSteps = routeCoords.length;
              const newProgress = totalSteps > 0 
                ? Math.min(((closestIdx + 1) / totalSteps) * 100, 100) 
                : 0;
              setProgress(newProgress);
            }
          }
        }, (err) => {
          console.error("TrackingPage: Live listener error:", err);
        });

        unsub = localUnsub;
      } catch (err) {
        console.error("TrackingPage: Failed to load Firestore imports:", err);
      }
    };

    setupLiveTracking();

    const startFallback = () => {
      if (hasLiveLocation || !isMounted) return;
      
      const speedMs = 6.94;
      const updateIntervalSeconds = 4;
      const distanceToMovePerUpdate = speedMs * updateIntervalSeconds;

      fallbackInterval = setInterval(() => {
        if (hasLiveLocation || !isMounted) {
          clearInterval(fallbackInterval);
          return;
        }
        
        setProgress((prev) => {
          const totalDistanceMeters = (activeRoute?.distance_km || 10) * 1000;
          const progressIncrement = (distanceToMovePerUpdate / totalDistanceMeters) * 100;
          const next = Math.min(prev + progressIncrement, 100);
          const totalCoords = routeCoords.length;

          const coordIndex = totalCoords > 0 
            ? Math.min(Math.floor((next / 100) * totalCoords), totalCoords - 1)
            : -1;

          if (coordIndex >= 0) {
            const newPos = routeCoords[coordIndex];
            if (newPos) busMarkerRef.current?.setLatLng(newPos);
          }

          if (next >= 100) clearInterval(fallbackInterval);
          return next;
        });
      }, updateIntervalSeconds * 1000);
    };

    const fallbackTimeout = setTimeout(startFallback, 3000);

    return () => {
      isMounted = false;
      if (localUnsub) localUnsub();
      if (unsub) unsub();
      if (fallbackInterval) clearInterval(fallbackInterval);
      clearTimeout(fallbackTimeout);
    };
  }, [routeCoords, activeRoute]);

  const isValidCoord = (lat?: number, lon?: number) =>
    lat !== undefined && lon !== undefined && lat > 15 && lat < 45 && lon > 65 && lon < 95;

  const [dataError, setDataError] = useState(false);

  useEffect(() => {
    if (activeRoute && activeTripType === "intercity") {
      const latFrom = Number(activeRoute?.lat_from || activeRoute?.start_lat);
      const lonFrom = Number(activeRoute?.lon_from || activeRoute?.start_lon);
      const latTo = Number(activeRoute?.lat_to || activeRoute?.end_lat);
      const lonTo = Number(activeRoute?.lon_to || activeRoute?.end_lon);

      if (!isValidCoord(latFrom, lonFrom) || !isValidCoord(latTo, lonTo)) {
        if (!from || !to) {
          setDataError(true);
        }
      } else {
        setDataError(false);
      }
    } else {
      setDataError(false);
    }
  }, [activeRoute, activeTripType, from, to]);

  if (dataError) {
    return (
      <PageShell>
        <div className="px-4 pt-4 flex items-center">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-10">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">{t("tracking.routeDataUnavailable")}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("tracking.preciseTrackingMissing")}
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-xl"
            onClick={() => navigate(-1)}
          >
            {t("tracking.returnToRoutes")}
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell noPadding>
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-base">{t("tracking.title")}</h1>
          <p className="text-xs text-crowd-low font-medium">
            {from} → {viaStop ? viaStop + " → " : ""}{to}
          </p>
        </div>
        <button className="p-1">
          <Info className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Leaflet Map */}
      <div className="mx-4 mt-3 rounded-xl bg-secondary h-64 relative overflow-hidden border border-border">
        <div ref={mapContainer} className="absolute inset-0 z-0" />
      </div>

      {/* Info panel */}
      <div className="px-4 pt-5 space-y-6 pb-20">
        {!location.state?.route && !localStorage.getItem('user_route_history') && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-2 animate-in fade-in slide-in-from-top-4">
             <div className="flex items-center gap-3 mb-2">
               <Zap className="w-5 h-5 text-blue-600 fill-blue-600" />
               <p className="text-sm font-bold text-blue-900">{t("tracking.getStarted")}</p>
             </div>
             <p className="text-xs text-blue-700 leading-relaxed mb-3">
               {t("tracking.getStartedBody")}
             </p>
          </div>
        )}

        {/* Popular Routes Section */}
        <MostUsedRoutes currentRouteId={location.state?.route ? (activeRoute?.route_id || activeRoute?.route_no) : undefined} />

        {/* Top Status Cards Grid */}
        <div className={`grid grid-cols-2 gap-3 transition-opacity duration-300 ${!activeRoute ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
              {t("tracking.currentStatus")}
            </p>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-crowd-low relative">
                <div className="absolute inset-0 bg-crowd-low rounded-full animate-ping opacity-75" />
              </div>
              <p className="font-bold text-sm leading-none">{t("tracking.onTime")}</p>
            </div>
            {(() => {
              const prediction = predictCrowd(from, to);
              return <CrowdBadge level={prediction.level} score={prediction.percentage} />;
            })()}
          </div>

          <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
              {t("tracking.nextStop")}
            </p>
            {isLoading ? (
              <p className="font-bold text-sm mb-1 text-muted-foreground animate-pulse">
                {t("tracking.calculating")}
              </p>
            ) : (
              (() => {
                const nextStop =
                  dynamicStops.find((s) => progress < s.progressAnchor) ||
                  dynamicStops[dynamicStops.length - 1];
                const timeRemaining = Math.max(
                  0,
                  Math.round(
                    (etaMinutes *
                      ((nextStop?.progressAnchor || 100) - progress)) /
                    100,
                  ),
                );

                return (
                  <>
                    <p className="font-bold text-sm truncate leading-none mb-1.5">
                      {nextStop?.name || to}
                    </p>
                    <p className="text-[10px] text-primary font-medium">
                      {t("tracking.arrivingIn", { minutes: timeRemaining })}
                    </p>
                  </>
                );
              })()
            )}
          </div>
        </div>

        {/* Route Timeline */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 ml-[73px]">
            {t("tracking.routeTimeline")}
          </h3>

          <div className="relative">
            <div className="absolute top-6 bottom-8 left-[73px] w-1.5 bg-blue-100 rounded-full overflow-hidden z-0">
              <div
                className="absolute top-0 left-0 w-full bg-blue-500 transition-all duration-1000 ease-linear"
                style={{ height: `${progress}%` }}
              />
            </div>

            <div className="relative z-10 flex flex-col">
              {dynamicStops.map((stop, index) => {
                const isPast = progress > stop.progressAnchor;
                const prevAnchor =
                  index === 0 ? -1 : dynamicStops[index - 1].progressAnchor;
                const isActiveTransit =
                  progress > prevAnchor && progress <= stop.progressAnchor;

                return (
                  <div key={index} className="flex items-stretch min-h-[60px]">
                    <div className="w-[60px] flex flex-col justify-start items-end pr-3 py-2 shrink-0 border-r-4 border-transparent">
                      <span
                        className={`text-[10px] font-medium leading-none ${isPast ? "text-muted-foreground/60" : "text-foreground/80"}`}
                      >
                        {stop.scheduledTime}
                      </span>
                      {!stop.isStart && !isPast && (
                        <span
                          className={`text-[10px] font-bold mt-1 leading-none ${isActiveTransit ? "text-destructive" : "text-primary"}`}
                        >
                          {isActiveTransit
                            ? stop.expectedTime
                            : stop.scheduledTime}
                        </span>
                      )}
                    </div>

                    <div className="w-8 flex justify-center py-2 shrink-0 relative z-10">
                      {isPast ? (
                        <div className="w-3 h-3 rounded-full bg-blue-400 border border-white shadow-[0_0_0_2px_background] mt-0.5" />
                      ) : isActiveTransit ? (
                        <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center -mt-2 shadow-md relative group">
                          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-40 group-hover:opacity-60" />
                          <Bus className="w-4 h-4 text-white relative z-10 drop-shadow-sm" />
                        </div>
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-blue-100 border-[3px] border-white shadow-[0_0_0_1px_#e2e8f0] mt-0.5" />
                      )}
                    </div>

                    <div
                      className={`flex-1 pl-3 py-1.5 ${!stop.isTerminal ? "border-b border-border/40" : ""} mb-2`}
                    >
                      <p
                        className={`font-bold text-sm leading-tight ${isActiveTransit ? "text-blue-600" : isPast ? "text-muted-foreground/80 line-through decoration-muted/50" : "text-foreground/90"}`}
                      >
                        {stop.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-medium bg-secondary/50 px-1 rounded">
                          {stop.distance}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
};

export default TrackingPage;
