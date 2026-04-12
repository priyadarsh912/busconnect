// ============================================================
// NEARBY BUS SERVICE — Geo-Query Engine for BusConnect (Supabase)
// ============================================================
// Migrated from Firestore/GeoFire to Supabase.
// Uses simple distance filtering for nearby buses (PostgreSQL).
// ============================================================

import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export interface NearbyBus {
    busId: string;
    driverId: string;
    latitude: number;
    longitude: number;
    speed: number;
    updatedAt: string | null;
    distanceKm: number;
}

export interface GeoQueryConfig {
    lat: number;
    lng: number;
    radiusKm: number;
    maxAgeSec?: number;
}

// ─────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────

const MIN_RADIUS_KM = 3;
const MAX_RADIUS_KM = 50;
const DEFAULT_MAX_AGE_SEC = 300;

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const isWithinAge = (updatedAt: string | null, maxAgeSec: number): boolean => {
    if (!updatedAt) return false;
    const now = Date.now();
    const updatedMs = new Date(updatedAt).getTime();
    return now - updatedMs <= maxAgeSec * 1000;
};

// ─────────────────────────────────────────────────
// CORE SERVICE
// ─────────────────────────────────────────────────

export const nearbyBusService = {
    /**
     * fetchNearbyBuses (One-shot)
     */
    fetchNearbyBuses: async (config: GeoQueryConfig): Promise<NearbyBus[]> => {
        const { lat, lng, maxAgeSec = DEFAULT_MAX_AGE_SEC } = config;
        const radiusKm = Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, config.radiusKm));

        // Fetch all buses with locations (ideally we would use PostGIS in SQL)
        const { data, error } = await supabase
            .from('buses')
            .select('*')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

        if (error) {
            console.error("Supabase fetchNearbyBuses error:", error);
            return [];
        }

        return data
            .map((bus: any) => {
                const dist = getDistanceKm(lat, lng, bus.latitude, bus.longitude);
                return {
                    busId: bus.id,
                    driverId: bus.driver_id,
                    latitude: bus.latitude,
                    longitude: bus.longitude,
                    speed: bus.speed || 0,
                    updatedAt: bus.updated_at,
                    distanceKm: Math.round(dist * 100) / 100,
                };
            })
            .filter((bus: NearbyBus) => 
                bus.distanceKm <= radiusKm && 
                isWithinAge(bus.updatedAt, maxAgeSec)
            )
            .sort((a, b) => a.distanceKm - b.distanceKm);
    },

    /**
     * onNearbyBusesChange (Real-time listener)
     */
    onNearbyBusesChange: (
        config: GeoQueryConfig,
        onUpdate: (buses: NearbyBus[]) => void,
        onError?: (error: Error) => void
    ) => {
        const { lat, lng, maxAgeSec = DEFAULT_MAX_AGE_SEC } = config;
        const radiusKm = Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, config.radiusKm));

        const channel = supabase
            .channel('nearby-buses')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'buses' },
                async () => {
                    // Re-fetch all nearby whenever any bus updates
                    // A more optimized way would be to update the local map, 
                    // but for simplicity we re-fetch the bounded set.
                    const buses = await nearbyBusService.fetchNearbyBuses(config);
                    onUpdate(buses);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Initial fetch
                    nearbyBusService.fetchNearbyBuses(config).then(onUpdate);
                }
                if (status === 'CHANNEL_ERROR' && onError) {
                    onError(new Error("Supabase Realtime Channel Error"));
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    },
};
