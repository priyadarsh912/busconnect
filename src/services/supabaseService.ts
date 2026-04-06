// ============================================================
// SUPABASE SERVICE — Parallel Backend for BusConnect
// ============================================================
// This service provides identical functionality to firestoreService
// but uses Supabase (PostgreSQL) as the storage engine.
// ============================================================

import { supabase } from "../lib/supabase";

export const supabaseService = {

    // 1. USER MANAGEMENT
    syncUserToSupabase: async (uid: string, data: any) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: uid,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    role: data.role || 'customer',
                    updated_at: new Date().toISOString()
                });
            if (error) console.error("Supabase syncUser Error:", error);
        } catch (e) {
            console.error("Supabase syncUser Exception:", e);
        }
    },

    // 2. BOOKINGS
    syncBookingToSupabase: async (bookingId: string, data: any) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .upsert({
                    // mapping firestore keys to supabase snake_case
                    user_id: data.userId || data.user_id,
                    from: data.from,
                    to: data.to,
                    travel_date: data.travelDate,
                    status: data.status || 'confirmed',
                    price: data.price,
                    passengers: data.passengers || 1,
                    departure_time: data.departureTime,
                    seat_numbers: data.seatNumbers || [],
                    user_name: data.userName,
                    created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                });
            if (error) console.error("Supabase syncBooking Error:", error);
        } catch (e) {
            console.error("Supabase syncBooking Exception:", e);
        }
    },

    // 3. SEARCH HISTORY
    syncSearchHistoryToSupabase: async (data: any) => {
        try {
            await supabase
                .from('search_history')
                .insert({
                    user_id: data.userId,
                    from: data.from,
                    to: data.to,
                    trip_type: data.tripType || 'intercity',
                    searched_at: new Date().toISOString()
                });
        } catch (e) {
            console.error("Supabase syncSearchHistory Exception:", e);
        }
    },

    // 4. USER ROUTES
    syncUserRouteToSupabase: async (data: any) => {
        try {
            await supabase
                .from('user_routes')
                .upsert({
                    user_id: data.userId,
                    source: data.source,
                    destination: data.destination,
                    frequency: data.frequency || 1,
                    last_used: new Date().toISOString()
                }, { onConflict: 'user_id,source,destination' });
        } catch (e) {
            console.error("Supabase syncUserRoute Exception:", e);
        }
    },

    // 5. BUS LOCATIONS
    syncBusLocationToSupabase: async (busId: string, data: any) => {
        try {
            await supabase
                .from('bus_locations')
                .upsert({
                    bus_id: busId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    speed: data.speed || 0,
                    updated_at: new Date().toISOString()
                });
        } catch (e) {
            // Quiet fail for high-frequency location updates
        }
    }
};
