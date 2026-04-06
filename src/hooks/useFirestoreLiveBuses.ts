// ============================================================
// useFirestoreLiveBuses — Hook for fetching real driver buses
// ============================================================
// Listens to the bus_locations Firestore collection in real-time
// and returns all active buses. This bridges the gap between
// the driver app (which writes to bus_locations) and the user
// app (which displays buses on the map).
// ============================================================

import { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import {
    collection,
    onSnapshot,
    type Unsubscribe,
} from "firebase/firestore";

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export interface FirestoreLiveBus {
    busId: string;
    driverId: string;
    latitude: number;
    longitude: number;
    geohash: string;
    speed: number;
    lastUpdated: any;
    distanceToUser: number;
    isLive: true; // marker to distinguish from simulated radar buses
}

// ─────────────────────────────────────────────────
// HELPER
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

const getTimestampMs = (ts: any): number => {
    if (!ts) return 0;
    if (ts.toMillis) return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    if (typeof ts === "number") return ts;
    return 0;
};

// ─────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────

export const useFirestoreLiveBuses = (
    userLocation: [number, number] | null,
    options?: {
        maxRadiusKm?: number;
        maxAgeSec?: number;
    }
) => {
    const { maxRadiusKm = 50, maxAgeSec = 300 } = options || {};
    const [liveBuses, setLiveBuses] = useState<FirestoreLiveBus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const unsubRef = useRef<Unsubscribe | null>(null);

    useEffect(() => {
        // Don't subscribe if db is not initialized
        if (!db) {
            setIsLoading(false);
            setError("Firebase not initialized");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const colRef = collection(db, "bus_locations");

            unsubRef.current = onSnapshot(
                colRef,
                (snapshot) => {
                    const now = Date.now();
                    const [uLat, uLon] = userLocation || [30.7333, 76.7794];

                    const buses: FirestoreLiveBus[] = [];

                    snapshot.docs.forEach((docSnap) => {
                        const data = docSnap.data();
                        const lat = data.latitude;
                        const lng = data.longitude;

                        // Skip invalid coordinates
                        if (typeof lat !== "number" || typeof lng !== "number") return;
                        if (lat === 0 && lng === 0) return;

                        // Staleness check
                        const updatedMs = getTimestampMs(
                            data.lastUpdated ?? data.updatedAt ?? data.timestamp
                        );
                        if (updatedMs > 0 && (now - updatedMs) > maxAgeSec * 1000) return;

                        // Distance check
                        const dist = getDistanceKm(uLat, uLon, lat, lng);
                        if (dist > maxRadiusKm) return;

                        buses.push({
                            busId: data.busId ?? data.bus_id ?? docSnap.id,
                            driverId: data.driverId ?? data.driver_id ?? "",
                            latitude: lat,
                            longitude: lng,
                            geohash: data.geohash ?? "",
                            speed: data.speed ?? 0,
                            lastUpdated: data.lastUpdated ?? data.updatedAt ?? data.timestamp,
                            distanceToUser: Math.round(dist * 100) / 100,
                            isLive: true,
                        });
                    });

                    // Sort by distance
                    buses.sort((a, b) => a.distanceToUser - b.distanceToUser);

                    setLiveBuses(buses);
                    setIsLoading(false);
                    setError(null);
                },
                (err) => {
                    console.error("[useFirestoreLiveBuses] Listener error:", err);
                    setError(err.message);
                    setIsLoading(false);
                }
            );
        } catch (err: any) {
            console.error("[useFirestoreLiveBuses] Setup error:", err);
            setError(err.message);
            setIsLoading(false);
        }

        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [
        userLocation?.[0]?.toFixed(3),
        userLocation?.[1]?.toFixed(3),
        maxRadiusKm,
        maxAgeSec,
    ]);

    return { liveBuses, isLoading, error };
};
