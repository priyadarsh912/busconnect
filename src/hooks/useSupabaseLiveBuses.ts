// ============================================================
// useSupabaseLiveBuses — Hook for fetching real driver buses (Supabase)
// ============================================================
// Migrated from Firestore. 
// Listens to the buses Table in Supabase (PostgreSQL) in real-time.
// ============================================================

import { useState, useEffect } from "react";
import { nearbyBusService, NearbyBus } from "../services/nearbyBusService";

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export interface SupabaseLiveBus {
    busId: string;
    driverId: string;
    latitude: number;
    longitude: number;
    speed: number;
    lastUpdated: string | null;
    distanceToUser: number;
    isLive: true; 
}

// ─────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────

export const useSupabaseLiveBuses = (
    userLocation: [number, number] | null,
    options?: {
        maxRadiusKm?: number;
        maxAgeSec?: number;
    }
) => {
    const { maxRadiusKm = 50, maxAgeSec = 300 } = options || {};
    const [liveBuses, setLiveBuses] = useState<SupabaseLiveBus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        const [uLat, uLon] = userLocation || [30.7333, 76.7794];

        const unsubscribe = nearbyBusService.onNearbyBusesChange(
            {
                lat: uLat,
                lng: uLon,
                radiusKm: maxRadiusKm,
                maxAgeSec,
            },
            (buses: NearbyBus[]) => {
                const mappedBuses: SupabaseLiveBus[] = buses.map(b => ({
                    busId: b.busId,
                    driverId: b.driverId,
                    latitude: b.latitude,
                    longitude: b.longitude,
                    speed: b.speed,
                    lastUpdated: b.updatedAt,
                    distanceToUser: b.distanceKm,
                    isLive: true
                }));
                setLiveBuses(mappedBuses);
                setIsLoading(false);
            },
            (err) => {
                console.error("[useSupabaseLiveBuses] Error:", err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [
        userLocation?.[0]?.toFixed(3),
        userLocation?.[1]?.toFixed(3),
        maxRadiusKm,
        maxAgeSec,
    ]);

    return { liveBuses, isLoading, error };
};
