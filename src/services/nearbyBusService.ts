// ============================================================
// NEARBY BUS SERVICE — Geo-Query Engine for BusConnect (Firebase)
// ============================================================
// Connects with the driver app which syncs to Firestore.
// Uses geofire-common and Firebase Firestore.
// ============================================================

import { collection, query, getDocs, onSnapshot, orderBy, startAt, endAt } from "firebase/firestore";
import { geohashQueryBounds, distanceBetween } from "geofire-common";
import { db } from "../lib/firebase";

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

const isWithinAge = (updatedAt: any, maxAgeSec: number): boolean => {
    if (!updatedAt) return false;
    const now = Date.now();
    let updatedMs = 0;
    
    if (updatedAt && typeof updatedAt.toMillis === 'function') {
        updatedMs = updatedAt.toMillis();
    } else if (updatedAt instanceof Date) {
        updatedMs = updatedAt.getTime();
    } else {
        updatedMs = new Date(updatedAt).getTime();
    }
    
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
        const radiusInM = radiusKm * 1000;
        const center = [lat, lng] as [number, number];

        try {
            const bounds = geohashQueryBounds(center, radiusInM);
            const promises = [];

            for (const b of bounds) {
                const q = query(
                    collection(db, "bus_locations"),
                    orderBy("geohash"),
                    startAt(b[0]),
                    endAt(b[1])
                );
                promises.push(getDocs(q));
            }

            const snapshots = await Promise.all(promises);
            const matchingDocs: NearbyBus[] = [];

            for (const snap of snapshots) {
                for (const doc of snap.docs) {
                    const data = doc.data();
                    const busLat = data.lat ?? data.latitude;
                    const busLng = data.lng ?? data.longitude;
                    
                    if (busLat === undefined || busLng === undefined) continue;

                    const distanceInKm = distanceBetween([busLat, busLng], center);
                    
                    if (distanceInKm <= radiusKm && isWithinAge(data.lastUpdated || data.timestamp, maxAgeSec)) {
                        matchingDocs.push({
                            busId: data.busId || doc.id,
                            driverId: data.driverId || doc.id,
                            latitude: busLat,
                            longitude: busLng,
                            speed: data.speed || 0,
                            updatedAt: data.lastUpdated ? (typeof data.lastUpdated.toDate === 'function' ? data.lastUpdated.toDate().toISOString() : new Date(data.lastUpdated).toISOString()) : null,
                            distanceKm: Math.round(distanceInKm * 100) / 100,
                        });
                    }
                }
            }

            return matchingDocs.sort((a, b) => a.distanceKm - b.distanceKm);
        } catch (error) {
            console.error("Firebase fetchNearbyBuses error:", error);
            throw error;
        }
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
        const radiusInM = radiusKm * 1000;
        const center = [lat, lng] as [number, number];

        const bounds = geohashQueryBounds(center, radiusInM);
        const unsubscribes: Array<() => void> = [];
        let allBuses: Map<string, NearbyBus> = new Map();

        try {
            for (const b of bounds) {
                const q = query(
                    collection(db, "bus_locations"),
                    orderBy("geohash"),
                    startAt(b[0]),
                    endAt(b[1])
                );

                const unsub = onSnapshot(q, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        const data = change.doc.data();
                        const busLat = data.lat ?? data.latitude;
                        const busLng = data.lng ?? data.longitude;

                        if (change.type === 'removed') {
                            allBuses.delete(change.doc.id);
                        } else if (busLat !== undefined && busLng !== undefined) {
                            const distanceInKm = distanceBetween([busLat, busLng], center);

                            if (distanceInKm <= radiusKm && isWithinAge(data.lastUpdated || data.timestamp, maxAgeSec)) {
                                allBuses.set(change.doc.id, {
                                    busId: data.busId || change.doc.id,
                                    driverId: data.driverId || change.doc.id,
                                    latitude: busLat,
                                    longitude: busLng,
                                    speed: data.speed || 0,
                                    updatedAt: data.lastUpdated ? (typeof data.lastUpdated.toDate === 'function' ? data.lastUpdated.toDate().toISOString() : new Date(data.lastUpdated).toISOString()) : null,
                                    distanceKm: Math.round(distanceInKm * 100) / 100,
                                });
                            } else {
                                allBuses.delete(change.doc.id);
                            }
                        }
                    });

                    // Emit updated list
                    const busesArray = Array.from(allBuses.values()).sort((a, b) => a.distanceKm - b.distanceKm);
                    onUpdate(busesArray);
                }, (error) => {
                    console.error("Firestore real-time error:", error);
                    if (onError) onError(error);
                });

                unsubscribes.push(unsub);
            }
        } catch (error: any) {
            console.error("Failed to setup Firebase listeners:", error);
            unsubscribes.forEach(unsub => unsub());
            if (onError) onError(error);
        }

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    },
};
