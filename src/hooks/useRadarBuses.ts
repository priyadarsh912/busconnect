import { useState, useEffect, useCallback } from 'react';
import { loadRadarBuses, RadarBus } from '../utils/RadarLoader';

// Helper to calculate distance between two coordinates in km (Haversine formula)
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const CITY_COORDS: Record<string, [number, number]> = {
    // Cities
    "Chandigarh": [30.7333, 76.7794],
    "Mohali": [30.7046, 76.7179],
    "Ropar": [30.9639, 76.5267],
    "Ludhiana": [30.9000, 75.8573],
    "Amritsar": [31.6340, 74.8723],
    "Jalandhar": [31.3260, 75.5762],
    "Patiala": [30.3398, 76.3869],
    "Bathinda": [30.2110, 74.9455],
    "Hoshiarpur": [31.5143, 75.9115],
    "Pathankot": [32.2643, 75.6522],
    "Ferozepur": [30.9235, 74.6148],
    "Moga": [30.8178, 75.1699],
    "Kapurthala": [31.3808, 75.3800],

    // Sectors & Stands
    "Sector 43 Bus Stand": [30.7250, 76.7460],
    "ISBT 17": [30.7398, 76.7827],
    "Phase 6": [30.7335, 76.7179],
    "Sector 17": [30.7398, 76.7827],
    "Sector 35": [30.7285, 76.7562],
    "Sector 43": [30.7250, 76.7460],
};

const polylineCache: Record<string, [number, number][]> = {};

const fetchRoadPolyline = async (coords: [number, number][]): Promise<[number, number][]> => {
    const cacheKey = coords.map(c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join('|');
    if (polylineCache[cacheKey]) return polylineCache[cacheKey];

    try {
        const query = coords.map(c => `${c[1]},${c[0]}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${query}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM error");
        const data = await res.json();
        const rawCoords: number[][] = data?.routes?.[0]?.geometry?.coordinates;
        if (!rawCoords || rawCoords.length === 0) throw new Error("No geometry");

        const roadPolyline = rawCoords.map((c) => [c[1], c[0]] as [number, number]);
        polylineCache[cacheKey] = roadPolyline;
        return roadPolyline;
    } catch (error) {
        console.error("OSRM Polyline Fetch Failed:", error);
        return coords;
    }
};

export interface RadarBusWithMovement extends RadarBus {
    current_lat: number;
    current_lon: number;
    distanceToUser: number;
    polyline_index: number;
    is_paused: boolean;
    pause_until: number;
    full_polyline: [number, number][];
}

export const useRadarBuses = (userLocation: [number, number] | null) => {
    const [buses, setBuses] = useState<RadarBusWithMovement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // Initial load and polyline generation
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const data = await loadRadarBuses();

            // Limit to top 40 for performance
            const targetBuses = data.slice(0, 40);
            const [uLat, uLon] = userLocation || [30.7333, 76.7794];

            // Load buses sequentially or in small chunks to avoid OSRM 429s
            const enriched: RadarBusWithMovement[] = [];

            // Process in chunks of 5
            const chunkSize = 5;
            for (let i = 0; i < targetBuses.length; i += chunkSize) {
                const chunk = targetBuses.slice(i, i + chunkSize);
                const results = await Promise.all(chunk.map(async (bus) => {
                    const stops = [
                        [bus.start_lat, bus.start_lon],
                        CITY_COORDS[bus.stop_1] || [bus.start_lat, bus.start_lon],
                        CITY_COORDS[bus.stop_2] || [bus.end_lat, bus.end_lon],
                        [bus.end_lat, bus.end_lon]
                    ] as [number, number][];

                    // Attempt fetch, but fallback is built-in
                    const polyline = await fetchRoadPolyline(stops);
                    const startIndex = Math.floor(Math.random() * polyline.length);
                    const currentLat = polyline[startIndex][0];
                    const currentLon = polyline[startIndex][1];

                    return {
                        ...bus,
                        current_lat: currentLat,
                        current_lon: currentLon,
                        polyline_index: startIndex,
                        full_polyline: polyline,
                        is_paused: false,
                        pause_until: 0,
                        distanceToUser: getDistanceKm(uLat, uLon, currentLat, currentLon)
                    };
                }));
                enriched.push(...results);

                // Update state incrementally so buses appear faster
                if (i === 0) setBuses([...results]);
                else setBuses(prev => [...prev, ...results]);

                if (i === 0) setIsLoading(false);
            }
        };
        load();
    }, [userLocation === null]); // Reload if user location goes from null -> actual

    const updateMovement = useCallback(() => {
        if (!userLocation || buses.length === 0) return;

        setBuses(prevBuses => {
            const now = Date.now();
            const [userLat, userLon] = userLocation;

            const updated = prevBuses.map(bus => {
                const isOutstation = bus.route_type.toLowerCase() === 'outstation';
                // Outstation: 55 km/h -> 0.07639 km/5s
                // Intercity: 25 km/h -> 0.03472 km/5s
                const moveDistanceKm = isOutstation ? 0.07639 : 0.03472;

                if (bus.is_paused) {
                    if (now >= bus.pause_until) {
                        return { ...bus, is_paused: false };
                    }
                    return bus;
                }

                let remainingDist = moveDistanceKm;
                let currentIndex = bus.polyline_index;
                let currentPos = [bus.current_lat, bus.current_lon];

                while (remainingDist > 0) {
                    let nextIndex = currentIndex + 1;
                    if (nextIndex >= bus.full_polyline.length) {
                        nextIndex = 0; // Loop simulation
                    }

                    const nextPoint = bus.full_polyline[nextIndex];
                    const distToNext = getDistanceKm(currentPos[0], currentPos[1], nextPoint[0], nextPoint[1]);

                    if (distToNext > remainingDist) {
                        // Interpolate between current position and next point
                        const ratio = remainingDist / distToNext;
                        const newLat = currentPos[0] + (nextPoint[0] - currentPos[0]) * ratio;
                        const newLon = currentPos[1] + (nextPoint[1] - currentPos[1]) * ratio;

                        // Check for stops near the next interpolated point
                        const isAtStop = [bus.stop_1, bus.stop_2, bus.end_stop, bus.start_stop].some(stopName => {
                            const stopCoords = CITY_COORDS[stopName];
                            if (!stopCoords) return false;
                            return getDistanceKm(newLat, newLon, stopCoords[0], stopCoords[1]) < 0.1;
                        });

                        if (isAtStop && Math.random() < 0.4) { // Increased probability for verification
                            return {
                                ...bus,
                                is_paused: true,
                                pause_until: now + (10000 + Math.random() * 5000), // 10-15s pause
                                current_lat: newLat,
                                current_lon: newLon,
                                polyline_index: currentIndex,
                                distanceToUser: getDistanceKm(userLat, userLon, newLat, newLon)
                            };
                        }

                        return {
                            ...bus,
                            current_lat: newLat,
                            current_lon: newLon,
                            polyline_index: currentIndex,
                            distanceToUser: getDistanceKm(userLat, userLon, newLat, newLon)
                        };
                    } else {
                        // Advance to next point completely
                        remainingDist -= distToNext;
                        currentIndex = nextIndex;
                        currentPos = nextPoint;
                    }
                }

                return {
                    ...bus,
                    current_lat: currentPos[0],
                    current_lon: currentPos[1],
                    polyline_index: currentIndex,
                    distanceToUser: getDistanceKm(userLat, userLon, currentPos[0], currentPos[1])
                };
            });

            return updated;
        });
        setLastRefresh(new Date());
    }, [userLocation, buses.length]);

    // Update movement every 5 seconds
    useEffect(() => {
        const interval = setInterval(updateMovement, 5000);
        return () => clearInterval(interval);
    }, [updateMovement]);

    const nearbyBusesRaw = buses
        .filter(b => b.distanceToUser <= 35)
        .filter(b => {
            // Apply 2km rule for Private Volvo buses
            if (b.operator === 'Private Volvo') {
                const stops = [b.start_stop, b.stop_1, b.stop_2, b.end_stop];
                const isNearStop = stops.some(stopName => {
                    const stopCoords = CITY_COORDS[stopName];
                    if (!stopCoords) return false;
                    const distanceToStop = getDistanceKm(userLocation[0], userLocation[1], stopCoords[0], stopCoords[1]);
                    return distanceToStop <= 2.0;
                });
                return isNearStop;
            }
            return true;
        })
        .sort((a, b) => a.distanceToUser - b.distanceToUser);

    const filteredBuses: RadarBusWithMovement[] = [];
    for (const bus of nearbyBusesRaw) {
        if (filteredBuses.length >= 5) break;

        // Ensure 1km spacing between visible buses
        const isTooClose = filteredBuses.some(selected =>
            getDistanceKm(bus.current_lat, bus.current_lon, selected.current_lat, selected.current_lon) < 1.0
        );

        if (!isTooClose) {
            filteredBuses.push(bus);
        }
    }

    return { nearbyBuses: filteredBuses, isLoading, lastRefresh };
};
