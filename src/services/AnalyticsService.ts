import { analytics } from '../lib/firebase';
import { logEvent } from 'firebase/analytics';
import { supabase } from '../lib/supabase';
import { authService } from './authService';
import { networkManager } from './offline/NetworkManager';
import { syncQueueService, SyncPriority } from './offline/SyncQueueService';
import { Device } from '@capacitor/device';

export interface AnalyticsEvent {
    event_name: string;
    properties?: Record<string, any>;
    timestamp?: number;
    user_id?: string;
    device_id?: string;
    network_status?: 'online' | 'offline';
}

class AnalyticsService {
    private deviceId: string | null = null;

    constructor() {
        this.init();
    }

    private async init() {
        try {
            const info = await Device.getId();
            this.deviceId = info.identifier;
        } catch (e) {
            console.warn("AnalyticsService: Failed to get device ID", e);
        }
    }

    /**
     * Log a single event to all active channels
     */
    async logEvent(name: string, properties: Record<string, any> = {}) {
        const user = authService.getCurrentUser();
        const isOnline = networkManager.getStatus();
        
        const event: AnalyticsEvent = {
            event_name: name,
            properties,
            timestamp: Math.floor(Date.now() / 1000),
            user_id: user?.id || 'anonymous',
            device_id: this.deviceId || 'unknown',
            network_status: isOnline ? 'online' : 'offline'
        };

        console.log(`[Analytics] ${name}:`, event);

        // CHANNEL 1: Firebase Analytics (Always try if available)
        if (analytics) {
            try {
                logEvent(analytics, name, {
                    ...properties,
                    user_id: event.user_id,
                    network_status: event.network_status
                });
            } catch (e) {
                console.warn("AnalyticsService: Firebase log failed", e);
            }
        }

        // CHANNEL 2: Supabase / Offline Queue
        if (isOnline) {
            try {
                // Log directly to Supabase for immediate dashboard updates
                await supabase.from('analytics_events').insert([{
                    event_name: name,
                    user_id: event.user_id,
                    properties: properties,
                    network_status: 'online',
                    timestamp: new Date().toISOString()
                }]);
            } catch (e) {
                console.warn("AnalyticsService: Supabase direct log failed, falling back to queue");
                await this.enqueueOffline(event);
            }
        } else {
            // Log to local queue if offline
            await this.enqueueOffline(event);
        }
    }

    private async enqueueOffline(event: AnalyticsEvent) {
        console.log(`[Analytics] Offline: Enqueueing event ${event.event_name}`);
        await syncQueueService.enqueue('ANALYTICS', event, SyncPriority.LOW);
    }

    // --- Convenience Methods ---

    trackAppOpen() { this.logEvent('app_opened'); }
    
    trackSearch(from: string, to: string, date: string) {
        this.logEvent('search_bus', { from, to, travel_date: date });
    }

    trackBookingStart(busId: string, route: string) {
        this.logEvent('booking_started', { bus_id: busId, route });
    }

    trackPayment(status: 'success' | 'failed' | 'initiated', amount: number, method: string) {
        this.logEvent(`payment_${status}`, { amount, method });
    }

    trackSync(status: 'success' | 'failed' | 'started', type: string) {
        this.logEvent(`sync_${status}`, { sync_type: type });
    }
}

export const analyticsService = new AnalyticsService();
