// ============================================================
// FIRESTORE SERVICE — Complete Backend for BusConnect
// ============================================================
// Architecture:
//   - Firebase Auth handles ONLY login (phone/email)
//   - NO passwords or auth credentials stored here
//   - Firebase UID (user.uid) is the primary key for all user data
//   - All application data lives in Cloud Firestore
// ============================================================

import { db } from "../lib/firebase";
import { notificationService } from "./notificationService";
import { supabaseService } from "./supabaseService";
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    type Unsubscribe
} from "firebase/firestore";

// ─────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────

export interface UserProfile {
    name: string;
    phone: string | null;
    email: string | null;
    role: "customer" | "driver" | "admin";
    createdAt: any; // Firestore Timestamp
}

export interface BookingData {
    userId: string;
    from: string;
    to: string;
    travelDate: string;
    status: "pending" | "confirmed" | "cancelled";
    price?: number;
    passengers?: number;
    departureTime?: string;
    seatNumbers?: string[];
    userName?: string;
    createdAt: any;
}

export interface BusLocationData {
    latitude: number;
    longitude: number;
    speed?: number;
    updatedAt: any;
}

export interface SearchHistoryEntry {
    userId: string;
    from: string;
    to: string;
    tripType?: string;
    searchedAt: any;
}

export interface UserRouteEntry {
    userId: string;
    source: string;
    destination: string;
    frequency: number;
    lastUsed: any;
}

export interface DashboardStats {
    totalBookings: number;
    activeUsers: number;
    popularRoutes: { from: string; to: string; count: number }[];
}

// ─────────────────────────────────────────────────
// COLLECTION NAMES (single source of truth)
// ─────────────────────────────────────────────────
const COLLECTIONS = {
    USERS: "users",
    BOOKINGS: "bookings",
    BUS_LOCATIONS: "bus_locations",
    SEARCH_HISTORY: "search_history",
    USER_ROUTES: "user_routes",
    DASHBOARD_STATS: "dashboard_stats",
} as const;

// ─────────────────────────────────────────────────
// CORE FIRESTORE SERVICE
// ─────────────────────────────────────────────────

export const firestoreService = {

    // ===========================================================
    // 1. USER MANAGEMENT
    // ===========================================================

    /**
     * Create or update a user document in Firestore.
     * Called automatically on login/signup.
     * Uses Firebase UID as the document ID.
     */
    createOrUpdateUser: async (
        uid: string,
        name: string,
        emailOrPhone: string,
        type: "email" | "phone",
        role: "customer" | "driver" | "admin" = "customer"
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const userRef = doc(db, COLLECTIONS.USERS, uid);
            const existingDoc = await getDoc(userRef);

            if (existingDoc.exists()) {
                // Update existing user — preserve createdAt
                await setDoc(userRef, {
                    name,
                    email: type === "email" ? emailOrPhone : existingDoc.data().email || null,
                    phone: type === "phone" ? emailOrPhone : existingDoc.data().phone || null,
                    role,
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            } else {
                // Create new user
                await setDoc(userRef, {
                    name,
                    email: type === "email" ? emailOrPhone : null,
                    phone: type === "phone" ? emailOrPhone : null,
                    role,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }

            // [SYNC] Back up to Supabase
            supabaseService.syncUserToSupabase(uid, {
                name,
                email: type === "email" ? emailOrPhone : null,
                phone: type === "phone" ? emailOrPhone : null,
                role
            });

            return { success: true };
        } catch (error: any) {
            console.error("Firestore createOrUpdateUser Error:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Check if a user with the given phone number exists.
     */
    checkUserExistsByPhone: async (phone: string): Promise<boolean> => {
        try {
            const q = query(collection(db, COLLECTIONS.USERS), where("phone", "==", phone));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error: any) {
            console.error("Firestore checkUserExistsByPhone Error:", error.message);
            // Default to allowing the flow if there's a temporary DB error
            return false;
        }
    },

    /**
     * Backward-compatible alias used by authService
     */
    createUserProfile: async (
        uid: string,
        name: string,
        emailOrPhone: string,
        type: "email" | "phone"
    ): Promise<{ success: boolean; error?: string }> => {
        return firestoreService.createOrUpdateUser(uid, name, emailOrPhone, type, "customer");
    },

    /**
     * Save/update user profile data (name, email, phone, role).
     * Called when user edits their profile.
     */
    saveUserProfile: async (
        userId: string,
        profileData: Partial<UserProfile>
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const userRef = doc(db, COLLECTIONS.USERS, userId);
            await setDoc(userRef, {
                ...profileData,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            return { success: true };
        } catch (error: any) {
            console.error("Firestore saveUserProfile Error:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get a user profile by their Firebase UID.
     */
    getUserProfile: async (userId: string): Promise<UserProfile | null> => {
        try {
            const userRef = doc(db, COLLECTIONS.USERS, userId);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                return docSnap.data() as UserProfile;
            }
            return null;
        } catch (error: any) {
            console.error("Firestore getUserProfile Error:", error.message);
            return null;
        }
    },

    /**
     * Get all users (admin dashboard).
     */
    getAllUsers: async (): Promise<any[]> => {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
            return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error("Firestore getAllUsers Error:", e);
            return [];
        }
    },

    // ===========================================================
    // 2. BOOKINGS
    // ===========================================================

    /**
     * Create a new booking.
     * Called when user books a ticket.
     */
    createBooking: async (
        userId: string,
        from: string,
        to: string,
        travelDate: string,
        extras?: {
            price?: number;
            passengers?: number;
            departureTime?: string;
            seatNumbers?: string[];
            userName?: string;
        }
    ): Promise<{ success: boolean; bookingId?: string; error?: string }> => {
        try {
            const bookingData: any = {
                userId,
                from,
                to,
                travelDate,
                status: "confirmed",
                createdAt: serverTimestamp(),
            };

            // Add optional fields
            if (extras?.price !== undefined) bookingData.price = extras.price;
            if (extras?.passengers !== undefined) bookingData.passengers = extras.passengers;
            if (extras?.departureTime) bookingData.departureTime = extras.departureTime;
            if (extras?.seatNumbers) bookingData.seatNumbers = extras.seatNumbers;
            if (extras?.userName) bookingData.userName = extras.userName;

            const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), bookingData);
            
            // [SYNC] Back up to Supabase
            supabaseService.syncBookingToSupabase(docRef.id, bookingData);
            
            // Trigger local notification to show confirmed booking status
            notificationService.showLocalNotification(
               "Booking Confirmed! 🚌",
               `Trip from ${from} to ${to} is now locked in. Have a safe journey!`
            );

            return { success: true, bookingId: docRef.id };
        } catch (error: any) {
            console.error("Firestore createBooking Error:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Backward-compatible alias used by existing pages (BusResultsPage, BookTicketPage)
     */
    addBooking: async (bookingData: any): Promise<{ success: boolean; data?: any; error?: string }> => {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
                ...bookingData,
                status: bookingData.status || "confirmed",
                createdAt: serverTimestamp(),
            });
            return { success: true, data: { id: docRef.id, ...bookingData } };
        } catch (error: any) {
            console.error("Firestore addBooking Error:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update the status of an existing booking.
     */
    updateBookingStatus: async (
        bookingId: string,
        status: "pending" | "confirmed" | "cancelled"
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
            await updateDoc(bookingRef, {
                status,
                updatedAt: serverTimestamp(),
            });
            return { success: true };
        } catch (error: any) {
            console.error("Firestore updateBookingStatus Error:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get all bookings for a specific user.
     */
    getUserBookings: async (userId: string): Promise<any[]> => {
        try {
            const q = query(
                collection(db, COLLECTIONS.BOOKINGS),
                where("userId", "==", userId),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
        } catch (error: any) {
            // Fallback: try without ordering (index might not exist yet)
            try {
                const q = query(
                    collection(db, COLLECTIONS.BOOKINGS),
                    where("userId", "==", userId)
                );
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
            } catch (e) {
                console.error("Firestore getUserBookings Error:", e);
                return [];
            }
        }
    },

    /**
     * Backward-compatible alias for MyBookingsPage
     * Handles both new field names (userId) and legacy field names (user_id)
     */
    getBookingsPerUser: async (userId: string): Promise<any[]> => {
        try {
            // Try new field name first (userId)
            let results = await firestoreService.getUserBookings(userId);

            // Also try legacy field name (user_id) and merge results
            try {
                const q = query(
                    collection(db, COLLECTIONS.BOOKINGS),
                    where("user_id", "==", userId)
                );
                const legacySnapshot = await getDocs(q);
                const legacyResults = legacySnapshot.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
                
                // Merge and deduplicate
                const existingIds = new Set(results.map((r: any) => r.firebaseId));
                for (const lr of legacyResults) {
                    if (!existingIds.has(lr.firebaseId)) {
                        results.push(lr);
                    }
                }
            } catch (_) {
                // Ignore legacy errors
            }

            return results;
        } catch (error) {
            console.error("Firestore getBookingsPerUser Error:", error);
            return [];
        }
    },

    /**
     * Get all bookings (admin dashboard).
     */
    getAllBookings: async (): Promise<any[]> => {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTIONS.BOOKINGS));
            return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            return [];
        }
    },

    // ===========================================================
    // 3. SEARCH HISTORY
    // ===========================================================

    /**
     * Save a search to history.
     * Called automatically when user searches for routes.
     */
    saveSearchHistory: async (
        userId: string,
        from: string,
        to: string,
        tripType: string = "intercity"
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            await addDoc(collection(db, COLLECTIONS.SEARCH_HISTORY), {
                userId,
                from,
                to,
                tripType,
                searchedAt: serverTimestamp(),
            });

            // [SYNC] Back up to Supabase
            supabaseService.syncSearchHistoryToSupabase({ userId, from, to, tripType });
            return { success: true };
        } catch (error: any) {
            console.error("Firestore saveSearchHistory Error:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get search history for a specific user.
     */
    getRouteHistory: async (userId: string): Promise<any[]> => {
        try {
            const q = query(
                collection(db, COLLECTIONS.SEARCH_HISTORY),
                where("userId", "==", userId),
                orderBy("searchedAt", "desc"),
                limit(50)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(d => d.data());
        } catch (error) {
            // Fallback: try legacy field name
            try {
                const q = query(
                    collection(db, COLLECTIONS.SEARCH_HISTORY),
                    where("user_id", "==", userId)
                );
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(d => d.data());
            } catch (e) {
                return [];
            }
        }
    },

    // ===========================================================
    // 4. USER ROUTES (Saved / Frequent Routes)
    // ===========================================================

    /**
     * Save a user's selected route (for frequency tracking and suggestions).
     * Called when user selects a route for booking/tracking.
     */
    saveUserRoute: async (
        userId: string,
        source: string,
        destination: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            // Check if this route already exists for this user
            const q = query(
                collection(db, COLLECTIONS.USER_ROUTES),
                where("userId", "==", userId),
                where("source", "==", source),
                where("destination", "==", destination)
            );
            const existingSnapshot = await getDocs(q);

            if (!existingSnapshot.empty) {
                // Update frequency and lastUsed
                const existingDoc = existingSnapshot.docs[0];
                const currentFreq = existingDoc.data().frequency || 0;
                await updateDoc(doc(db, COLLECTIONS.USER_ROUTES, existingDoc.id), {
                    frequency: currentFreq + 1,
                    lastUsed: serverTimestamp(),
                });
            } else {
                // Create new route record
                await addDoc(collection(db, COLLECTIONS.USER_ROUTES), {
                    userId,
                    source,
                    destination,
                    frequency: 1,
                    lastUsed: serverTimestamp(),
                    createdAt: serverTimestamp(),
                });
            }

            // [SYNC] Back up to Supabase
            supabaseService.syncUserRouteToSupabase({ userId, source, destination, frequency: 1 });

            return { success: true };
        } catch (error: any) {
            console.error("Firestore saveUserRoute Error:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get a user's most frequent routes.
     */
    getUserRoutes: async (userId: string, maxResults: number = 10): Promise<any[]> => {
        try {
            const q = query(
                collection(db, COLLECTIONS.USER_ROUTES),
                where("userId", "==", userId),
                orderBy("frequency", "desc"),
                limit(maxResults)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            // Fallback without ordering
            try {
                const q = query(
                    collection(db, COLLECTIONS.USER_ROUTES),
                    where("userId", "==", userId)
                );
                const querySnapshot = await getDocs(q);
                const results = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                return results.sort((a: any, b: any) => (b.frequency || 0) - (a.frequency || 0)).slice(0, maxResults);
            } catch (e) {
                return [];
            }
        }
    },

    // ===========================================================
    // 5. BUS LOCATIONS (Live Tracking)
    // ===========================================================

    /**
     * Update a bus's live GPS location.
     * Uses bus_id as the document ID for instant lookup.
     */
    updateBusLocation: async (
        busId: string,
        latitude: number,
        longitude: number,
        speed?: number
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const locationData: any = {
                latitude,
                longitude,
                updatedAt: serverTimestamp(),
            };
            if (speed !== undefined) locationData.speed = speed;

            await setDoc(doc(db, COLLECTIONS.BUS_LOCATIONS, busId), locationData, { merge: true });

            // [SYNC] Back up to Supabase
            supabaseService.syncBusLocationToSupabase(busId, locationData);
            return { success: true };
        } catch (error: any) {
            console.error("Firestore updateBusLocation Error:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get a bus's current location (single read).
     */
    getBusLocation: async (busId: string): Promise<BusLocationData | null> => {
        try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.BUS_LOCATIONS, busId));
            if (docSnap.exists()) {
                return docSnap.data() as BusLocationData;
            }
            return null;
        } catch (error) {
            console.error("Firestore getBusLocation Error:", error);
            return null;
        }
    },

    // ===========================================================
    // 6. REAL-TIME LISTENERS (onSnapshot)
    // ===========================================================

    /**
     * Listen to a specific bus location in real time.
     * Returns an unsubscribe function.
     */
    onBusLocationChange: (
        busId: string,
        callback: (location: BusLocationData | null) => void
    ): Unsubscribe => {
        const busRef = doc(db, COLLECTIONS.BUS_LOCATIONS, busId);
        return onSnapshot(busRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data() as BusLocationData);
            } else {
                callback(null);
            }
        }, (error) => {
            console.error("Real-time bus location error:", error);
            callback(null);
        });
    },

    /**
     * Listen to all bus locations in real time (admin/tracking dashboard).
     * Returns an unsubscribe function.
     */
    onAllBusLocationsChange: (
        callback: (locations: Array<{ busId: string } & BusLocationData>) => void
    ): Unsubscribe => {
        const colRef = collection(db, COLLECTIONS.BUS_LOCATIONS);
        return onSnapshot(colRef, (snapshot) => {
            const locations = snapshot.docs.map(d => ({
                busId: d.id,
                ...d.data()
            })) as Array<{ busId: string } & BusLocationData>;
            callback(locations);
        }, (error) => {
            console.error("Real-time all bus locations error:", error);
            callback([]);
        });
    },

    /**
     * Listen to booking updates for a specific user in real time.
     * Returns an unsubscribe function.
     */
    onUserBookingsChange: (
        userId: string,
        callback: (bookings: any[]) => void
    ): Unsubscribe => {
        const q = query(
            collection(db, COLLECTIONS.BOOKINGS),
            where("userId", "==", userId)
        );
        return onSnapshot(q, (snapshot) => {
            const bookings = snapshot.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
            callback(bookings);
        }, (error) => {
            console.error("Real-time user bookings error:", error);
            callback([]);
        });
    },

    /**
     * Listen to all bookings in real time (admin live dashboard).
     * Returns an unsubscribe function.
     */
    onAllBookingsChange: (
        callback: (bookings: any[]) => void
    ): Unsubscribe => {
        const colRef = collection(db, COLLECTIONS.BOOKINGS);
        return onSnapshot(colRef, (snapshot) => {
            const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(bookings);
        }, (error) => {
            console.error("Real-time all bookings error:", error);
            callback([]);
        });
    },

    // ===========================================================
    // 7. DASHBOARD STATS
    // ===========================================================

    /**
     * Get dashboard statistics.
     */
    getDashboardStats: async (): Promise<DashboardStats> => {
        try {
            const [bookingsSnap, usersSnap, historySnap] = await Promise.all([
                getDocs(collection(db, COLLECTIONS.BOOKINGS)),
                getDocs(collection(db, COLLECTIONS.USERS)),
                getDocs(collection(db, COLLECTIONS.SEARCH_HISTORY)),
            ]);

            // Count popular routes from search history
            const routeCountMap: Record<string, { from: string; to: string; count: number }> = {};
            historySnap.docs.forEach(d => {
                const data = d.data();
                const key = `${data.from || data.from_location}→${data.to || data.to_location}`;
                if (routeCountMap[key]) {
                    routeCountMap[key].count++;
                } else {
                    routeCountMap[key] = {
                        from: data.from || data.from_location || "Unknown",
                        to: data.to || data.to_location || "Unknown",
                        count: 1,
                    };
                }
            });

            const popularRoutes = Object.values(routeCountMap)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            return {
                totalBookings: bookingsSnap.size,
                activeUsers: usersSnap.size,
                popularRoutes,
            };
        } catch (error) {
            console.error("Firestore getDashboardStats Error:", error);
            return {
                totalBookings: 0,
                activeUsers: 0,
                popularRoutes: [],
            };
        }
    },
};
