import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Info,
  Search,
  MapPin,
  Clock,
  Users,
  Bus,
} from "lucide-react";
import CrowdBadge from "@/components/CrowdBadge";
import PageShell from "@/components/PageShell";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Leaflet + bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import * as XLSX from "xlsx";
import { validateStops } from "@/utils/corridorUtils";

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
  const { route, tripType } = location.state || {};
  const from = tripType === "intercity" ? (route?.from_stop || "Sector 17") : (route?.start_stop || route?.start_city || "");
  const to = tripType === "intercity" ? (route?.to_stop || "Phase 5") : (route?.end_stop || route?.end_city || "");

  const rawViaStop = tripType === "intercity" ? (route?.stop || "") : (route?.stop_1 || route?.stop_city || "");
  const rawViaStop2 = tripType === "outstation" ? (route?.stop_2 || "") : "";

  // Validate intermediate stops based on predefined corridors to avoid impossible geography
  const validatedStops = validateStops(from, to, [rawViaStop, rawViaStop2]);
  const viaStop = validatedStops.length > 0 ? validatedStops[0] : "";
  const viaStop2 = validatedStops.length > 1 ? validatedStops[1] : "";

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routingLayer = useRef<L.LayerGroup | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);

  const [distance, setDistance] = useState<string>("Calculating...");
  const [eta, setEta] = useState<string>("...");
  const [etaMinutes, setEtaMinutes] = useState<number>(0);
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

  // Helper to fetch coordinates from a city name using OpenStreetMap Nominatim or cache
  const getCoordinates = async (
    city: string,
  ): Promise<[number, number] | null> => {
    // Instant cache return for accurate MVP routing
    if (CITY_COORDS[city]) {
      return CITY_COORDS[city];
    }

    // Fallback Geocoding
    try {
      let query = city;
      if (city.includes("Sector") || city.includes("IT Park")) query += ", Chandigarh";
      if (city.includes("Phase")) query += ", Mohali";

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
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
    const liveLat = route?.current_lat || route?.start_lat;
    const liveLon = route?.current_lon || route?.start_lon;
    const initialCenter: [number, number] = liveLat && liveLon
      ? [liveLat, liveLon]
      : route?.lat_from && route?.lon_from
        ? [route.lat_from, route.lon_from]
        : [30.7333, 76.7794];

    const mapInstance = L.map(container).setView(initialCenter, 14); // Zoom in closer for "Uber-like" feel
    map.current = mapInstance;
    routingLayer.current = L.layerGroup().addTo(mapInstance);

    // Add Free OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance);

    // Fetch and draw route
    const drawRoute = async () => {
      setIsLoading(true);
      const fromCoords: [number, number] | null = route && route.lat_from ? [route.lat_from, route.lon_from] : await getCoordinates(from);
      const toCoords: [number, number] | null = route && route.lat_to ? [route.lat_to, route.lon_to] : await getCoordinates(to);
      const stopCoords: [number, number] | null = route && route.lat_stop ? [route.lat_stop, route.lon_stop] : (viaStop ? await getCoordinates(viaStop) : null);
      const stop2Coords: [number, number] | null = viaStop2 ? await getCoordinates(viaStop2) : null;

      if (fromCoords && toCoords) {
        try {
          // If we have a pre-computed full polyline from Radar, skip OSRM overhead entirely
          if (route && route.full_polyline) {
            const coords = route.full_polyline;
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
            const busStartCoords = (route.current_lat && route.current_lon)
              ? [route.current_lat, route.current_lon] as [number, number]
              : coords[0];

            busMarkerRef.current = L.marker(busStartCoords, { icon: busIcon })
              .addTo(routingLayer.current!)
              .bindTooltip("Live Bus Position")
              .openTooltip();

            // Keep map firmly focused on the bus
            mapInstance.setView(busStartCoords, 14);

            setDistance((route.distance_km || 10).toFixed(1) + " km");
            setEtaMinutes(route.etaMinutes || 0);
            setEta((route.etaMinutes || 0) + " mins");

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
          const routeData = await res.json();

          if (routeData.code === "Ok" && routeData.routes.length > 0) {
            const osrmRoute = routeData.routes[0];

            // Set Distance & ETA state correctly utilizing osrmRoute distance, not the outer route
            setDistance((osrmRoute.distance / 1000).toFixed(1) + " km");
            const mins = Math.round(osrmRoute.duration / 60);
            setEtaMinutes(mins);
            setEta(mins + " mins");

            // Draw route on map using L.geoJSON to exactly follow the road geometry
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

            const steps = osrmRoute.legs?.[0]?.steps || [];
            let accumulatedDistance = 0;
            let accumulatedDuration = 0;
            let nextTarget = osrmRoute.distance / 5;
            const intermediateStops: Stop[] = [];

            for (const step of steps) {
              accumulatedDistance += step.distance;
              accumulatedDuration += step.duration;

              if (
                accumulatedDistance >= nextTarget &&
                intermediateStops.length < 4
              ) {
                if (
                  step.name &&
                  step.name.length > 2 &&
                  !step.name.toLowerCase().includes("roundabout") &&
                  !step.name.toLowerCase().includes("turn")
                ) {
                  const progressPct =
                    (accumulatedDistance / osrmRoute.distance) * 100;
                  const timeAtStop = new Date(
                    now.getTime() + accumulatedDuration * 1000,
                  );

                  intermediateStops.push({
                    name: intermediateStops.length === 0 && viaStop ? viaStop : step.name,
                    scheduledTime: formatTime(timeAtStop),
                    expectedTime: formatTime(
                      new Date(timeAtStop.getTime() + 2 * 60000),
                    ), // Simulate 2 min delay
                    distance: (accumulatedDistance / 1000).toFixed(1) + " km",
                    progressAnchor: progressPct,
                  });
                  nextTarget = accumulatedDistance + osrmRoute.distance / 5;
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
              ...intermediateStops,
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
            dashArray: "10, 10" // Visual indicator it's a direct line
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

          // Fallback UI timeline for when OSRM fails
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
      mapInstance.remove();
      map.current = null;
      routingLayer.current = null;
    };
  }, [from, to]);

  // Animation effect
  useEffect(() => {
    if (routeCoords.length === 0 || !busMarkerRef.current || etaMinutes === 0)
      return;

    // Speed: 25 km/h -> 25000 m / 3600 s ≈ 6.94 m/s
    const speedMs = 6.94;
    const updateIntervalSeconds = 4; // Update every 4 seconds
    const distanceToMovePerUpdate = speedMs * updateIntervalSeconds;

    const interval = setInterval(() => {
      setProgress((prev) => {
        // Calculate total route distance in meters if possible
        // For simplicity, we'll still use the 0-100 progress but scale it by real-world duration
        // Total distance is route.distance_km * 1000
        const totalDistanceMeters = (route?.distance_km || 10) * 1000;
        const progressIncrement = (distanceToMovePerUpdate / totalDistanceMeters) * 100;

        const next = Math.min(prev + progressIncrement, 100);

        const coordIndex = Math.min(
          Math.floor((next / 100) * routeCoords.length),
          routeCoords.length - 1,
        );

        const newPos = routeCoords[coordIndex];
        if (newPos) {
          busMarkerRef.current?.setLatLng(newPos);
        }

        if (next >= 100) clearInterval(interval);
        return next;
      });
    }, updateIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [routeCoords, etaMinutes]);

  const isValidCoord = (lat?: number, lon?: number) =>
    lat !== undefined && lon !== undefined && lat > 15 && lat < 45 && lon > 65 && lon < 95;

  // For outstation, we often don't have coords in dataset, so we rely on geocoding
  // Only show error if geocoding failed AND we don't have explicit dataset coords
  const [dataError, setDataError] = useState(false);

  useEffect(() => {
    if (tripType === "intercity") {
      if (!isValidCoord(route?.lat_from, route?.lon_from) || !isValidCoord(route?.lat_to, route?.lon_to)) {
        setDataError(true);
      }
    }
  }, [route, tripType]);

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
          <h2 className="text-lg font-bold text-foreground mb-2">Route data unavailable</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Precise tracking coordinates for this Chandigarh region route are currently missing.
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-xl"
            onClick={() => navigate(-1)}
          >
            Return to Routes
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
          <h1 className="font-bold text-base">Tracking Route</h1>
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
        {/* Top Status Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Status */}
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
              CURRENT STATUS
            </p>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-crowd-low relative">
                <div className="absolute inset-0 bg-crowd-low rounded-full animate-ping opacity-75" />
              </div>
              <p className="font-bold text-sm leading-none">On Time</p>
            </div>
            <p className="text-[10px] text-crowd-low font-medium">
              No delays reported
            </p>
          </div>

          {/* Next Stop */}
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
              NEXT STOP
            </p>
            {isLoading ? (
              <p className="font-bold text-sm mb-1 text-muted-foreground animate-pulse">
                Calculating...
              </p>
            ) : (
              (() => {
                // Find the next stop where the bus hasn't reached yet
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
                      Arriving in {timeRemaining} mins
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
            ROUTE TIMELINE
          </h3>

          <div className="relative">
            {/* Background Thick Line */}
            <div className="absolute top-6 bottom-8 left-[73px] w-1.5 bg-blue-100 rounded-full overflow-hidden z-0">
              {/* Active Filled Line */}
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
                    {/* Left: Time */}
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

                    {/* Center: Node */}
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

                    {/* Right: Info */}
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
