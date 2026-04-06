// ============================================================
// NEARBY BUS SERVICE — Geo-Query Engine for BusConnect
// ============================================================
// Uses geofire-common for efficient geohash-based Firestore
// queries. Supports dynamic radius (3–15 km), staleness
// filtering (60s), and real-time onSnapshot listeners.
// ============================================================

import { db } from "../lib/firebase";
import {
    collection,
    query,
    where,
    orderBy,
    startAt,
    endAt,
    getDocs,
    onSnapshot,
    type Unsubscribe,
    Timestamp,
} from "firebase/firestore";
import {
    geohashQueryBounds,
    distanceBetween,
    geohashForLocation,
} from "geofire-common";

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

export interface NearbyBus {
    busId: string;
    driverId: string;
    latitude: number;
    longitude: number;
    geohash: string;
    updatedAt: Timestamp | null;
    distanceKm: number;
}

export interface GeoQueryConfig {
    /** Center latitude */
    lat: number;
    /** Center longitude */
    lng: number;
    /** Search radius in kilometers (clamped to 3–15) */
    radiusKm: number;
    /** Maximum age of bus data in seconds (default: 60) */
    maxAgeSec?: number;
}

// ─────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────

const BUSES_COLLECTION = "bus_locations";
const MIN_RADIUS_KM = 3;
const MAX_RADIUS_KM = 15;
const DEFAULT_MAX_AGE_SEC = 300;

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────

/**
 * Clamp radius to the allowed 3–15 km range.
 */
const clampRadius = (r: number): number =>
    Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, r));

/**
 * Check whether a Firestore Timestamp is within the allowed age.
 */
const isWithinAge = (
    updatedAt: Timestamp | null | undefined,
    maxAgeSec: number
): boolean => {
    if (!updatedAt) return false;
    const nowMs = Date.now();
    const updatedMs =
        updatedAt instanceof Timestamp
            ? updatedAt.toMillis()
            : typeof updatedAt === "object" && "seconds" in updatedAt
            ? (updatedAt as any).seconds * 1000
            : 0;
    return nowMs - updatedMs <= maxAgeSec * 1000;
};

/**
 * Convert a Firestore bus document to a NearbyBus, calculating
 * the distance from the center point. Returns null if the bus
 * doesn't pass the radius or staleness filter.
 */
const docToNearbyBus = (
    docId: string,
    data: any,
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    maxAgeSec: number
): NearbyBus | null => {
    const lat = data.location?.latitude ?? data.latitude;
    const lng = data.location?.longitude ?? data.longitude;

    if (typeof lat !== "number" || typeof lng !== "number") return null;

    // Distance check (geofire-common returns meters)
    const distanceM = distanceBetween([lat, lng], [centerLat, centerLng]);
    const distanceKm = distanceM; // distanceBetween returns km
    if (distanceKm > radiusKm) return null;

    // Staleness check — driver app may use lastUpdated, updatedAt, or timestamp
    const updatedAt = data.lastUpdated ?? data.updatedAt ?? data.timestamp ?? null;
    if (!isWithinAge(updatedAt, maxAgeSec)) return null;

    return {
        busId: data.busId ?? data.bus_id ?? docId,
        driverId: data.driverId ?? data.driver_id ?? "",
        latitude: lat,
        longitude: lng,
        geohash: data.geohash ?? "",
        updatedAt,
        distanceKm: Math.round(distanceKm * 100) / 100,
    };
};

// ─────────────────────────────────────────────────
// CORE SERVICE
// ─────────────────────────────────────────────────

export const nearbyBusService = {
    /**
     * Generate a geohash for a given location.
     * Useful when a driver updates their position.
     */
    generateGeohash: (lat: number, lng: number): string => {
        return geohashForLocation([lat, lng]);
    },

    /**
     * One-shot fetch of nearby buses.
     * Fires multiple bounded queries (one per geohash range),
     * merges results, filters by exact distance and staleness.
     */
    fetchNearbyBuses: async (config: GeoQueryConfig): Promise<NearbyBus[]> => {
        const { lat, lng, maxAgeSec = DEFAULT_MAX_AGE_SEC } = config;
        const radiusKm = clampRadius(config.radiusKm);
        const radiusM = radiusKm * 1000;

        // geofire-common generates non-overlapping geohash bounds
        const bounds = geohashQueryBounds([lat, lng], radiusM);

        // Fan-out: one Firestore query per bound
        const queryPromises = bounds.map(([start, end]) => {
            const q = query(
                collection(db, BUSES_COLLECTION),
                orderBy("geohash"),
                startAt(start),
                endAt(end)
            );
            return getDocs(q);
        });

        const snapshots = await Promise.all(queryPromises);

        // Merge & deduplicate
        const busMap = new Map<string, NearbyBus>();
        for (const snap of snapshots) {
            for (const docSnap of snap.docs) {
                const bus = docToNearbyBus(
                    docSnap.id,
                    docSnap.data(),
                    lat,
                    lng,
                    radiusKm,
                    maxAgeSec
                );
                if (bus && !busMap.has(bus.busId)) {
                    busMap.set(bus.busId, bus);
                }
            }
        }

        // Sort by distance ascending
        return Array.from(busMap.values()).sort(
            (a, b) => a.distanceKm - b.distanceKm
        );
    },

    /**
     * Real-time listener for nearby buses.
     *
     * Sets up Firestore onSnapshot listeners for every geohash
     * bound, merges results, and calls `onUpdate` whenever any
     * query fires. Returns a single unsubscribe function that
     * tears down ALL listeners.
     *
     * Performance: Firestore only reads documents whose geohash
     * falls within the computed bounds — far fewer reads than
     * scanning the entire collection.
     */
    onNearbyBusesChange: (
        config: GeoQueryConfig,
        onUpdate: (buses: NearbyBus[]) => void,
        onError?: (error: Error) => void
    ): Unsubscribe => {
        const { lat, lng, maxAgeSec = DEFAULT_MAX_AGE_SEC } = config;
        const radiusKm = clampRadius(config.radiusKm);
        const radiusM = radiusKm * 1000;

        const bounds = geohashQueryBounds([lat, lng], radiusM);

        // Per-query partial results map (boundIndex -> Map<busId, NearbyBus>)
        const partials: Map<string, NearbyBus>[] = bounds.map(
            () => new Map()
        );

        // Debounce re-merge: when multiple queries fire simultaneously
        // (e.g. initial load), we only call onUpdate once.
        let mergeTimer: ReturnType<typeof setTimeout> | null = null;

        const emitMerged = () => {
            if (mergeTimer) clearTimeout(mergeTimer);
            mergeTimer = setTimeout(() => {
                const busMap = new Map<string, NearbyBus>();
                for (const partial of partials) {
                    for (const [id, bus] of partial) {
                        if (!busMap.has(id)) busMap.set(id, bus);
                    }
                }
                const sorted = Array.from(busMap.values()).sort(
                    (a, b) => a.distanceKm - b.distanceKm
                );
                onUpdate(sorted);
            }, 100); // 100ms debounce
        };

        // Set up listeners
        const unsubscribers: Unsubscribe[] = bounds.map(
            ([start, end], idx) => {
                const q = query(
                    collection(db, BUSES_COLLECTION),
                    orderBy("geohash"),
                    startAt(start),
                    endAt(end)
                );

                return onSnapshot(
                    q,
                    (snapshot) => {
                        const partial = new Map<string, NearbyBus>();
                        for (const docSnap of snapshot.docs) {
                            const bus = docToNearbyBus(
                                docSnap.id,
                                docSnap.data(),
                                lat,
                                lng,
                                radiusKm,
                                maxAgeSec
                            );
                            if (bus) partial.set(bus.busId, bus);
                        }
                        partials[idx] = partial;
                        emitMerged();
                    },
                    (error) => {
                        console.error(
                            `[NearbyBusService] Snapshot error for bound ${idx}:`,
                            error
                        );
                        onError?.(error as Error);
                    }
                );
            }
        );

        // Combined unsubscribe
        return () => {
            if (mergeTimer) clearTimeout(mergeTimer);
            unsubscribers.forEach((unsub) => unsub());
        };
    },
};
