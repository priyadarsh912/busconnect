import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { authService } from "../services/authService";
import { notificationService } from "../services/notificationService";
import { getDistance } from "../utils/distanceUtils";

export const useNotifications = () => {
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [notifyRadius, setNotifyRadius] = useState<number>(1000);
    const remindedBookings = useRef<Set<string>>(new Set());
    const lastNotifiedBuses = useRef<Map<string, number>>(new Map()); // busId -> lastNotifiedTimestamp

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (!user?.id) return;

        // 1. Fetch User Settings (notifyRadius) from Supabase profiles
        const fetchUserSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('notify_radius')
                    .eq('id', user.id)
                    .single();
                
                if (data) {
                    setNotifyRadius(data.notify_radius || 1000);
                }
            } catch (err) {
                console.error("Error fetching user settings from Supabase:", err);
            }
        };
        fetchUserSettings();

        // 2. Start Geolocation Watch
        let watchId: number;
        if ("geolocation" in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const newLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(newLocation);
                    // Sync with Supabase via notificationService
                    notificationService.updateUserLocation(newLocation.lat, newLocation.lng);
                },
                (err) => console.warn("Geolocation watch error:", err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }

        // 3. Listen for Nearby Buses (Proximity Alert) via Supabase Realtime
        const busesChannel = supabase
            .channel('bus-proximity-alerts')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'buses' },
                (payload) => {
                    if (!userLocation) return;
                    
                    const bus = payload.new;
                    if (bus.latitude && bus.longitude) {
                        const distance = getDistance(
                            bus.latitude,
                            bus.longitude,
                            userLocation.lat,
                            userLocation.lng
                        );

                        if (distance <= notifyRadius) {
                            const now = Date.now();
                            const lastTime = lastNotifiedBuses.current.get(bus.id) || 0;

                            if (now - lastTime > 10 * 60 * 1000) {
                                notificationService.showLocalNotification(
                                    "Bus Nearby 🚍",
                                    `A bus is within ${Math.round(distance)}m of your location!`
                                );
                                lastNotifiedBuses.current.set(bus.id, now);
                            }
                        }
                    }
                }
            )
            .subscribe();

        // 4. Listen for User Bookings (Reminder Alert) via Supabase Realtime
        const bookingsChannel = supabase
            .channel('booking-reminders')
            .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'bookings',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const booking = payload.new;
                    if (!booking || booking.status !== 'confirmed') return;

                    const now = Date.now();
                    const reminderWindow = 10 * 60 * 1000;
                    // Supabase uses ISO strings for timestamptz
                    const bookingTime = new Date(booking.created_at).getTime() + (2 * 60 * 60 * 1000); // Dummy: assume trip starts 2h after booking for test

                    if (bookingTime > now && 
                        bookingTime - now <= reminderWindow && 
                        !remindedBookings.current.has(booking.id)) {
                        
                        notificationService.showLocalNotification(
                            "Trip Reminder ⏰",
                            `Your trip starts in 10 minutes!`
                        );
                        remindedBookings.current.add(booking.id.toString());
                    }
                }
            )
            .subscribe();

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            supabase.removeChannel(busesChannel);
            supabase.removeChannel(bookingsChannel);
        };
    }, [userLocation?.lat, userLocation?.lng, notifyRadius]);

    return { userLocation, notifyRadius };
};
