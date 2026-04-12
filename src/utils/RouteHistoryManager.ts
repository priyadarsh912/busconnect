// src/utils/RouteHistoryManager.ts
import { authService } from '../services/authService';
import { busService } from '../services/busService';

export interface RouteUsage {
    route_id: string;
    origin: string;
    destination: string;
    usage: number;
    tripType: 'intercity' | 'outstation';
    rawRouteData: any;
    lastUsed: number;
}

const STORAGE_KEY = 'user_route_history';

export const RouteHistoryManager = {
    /**
     * Tracks a route interaction. If the route exists, increments usage.
     * If not, adds a new entry.
     */
    trackRoute: (route: any, tripType: 'intercity' | 'outstation') => {
        try {
            const historyJson = localStorage.getItem(STORAGE_KEY);
            let history: RouteUsage[] = historyJson ? JSON.parse(historyJson) : [];

            // Comprehensive field mapping for various route data structures
            const origin = (route.from_stop || route.start_stop || route.origin || route.start_city || route.from || '').trim();
            const destination = (route.to_stop || route.end_stop || route.destination || route.end_city || route.to || '').trim();

            if (!origin && !destination) {
                console.warn('Skipping route tracking: No origin or destination found', route);
                return;
            }

            const finalOrigin = origin || 'Unknown';
            const finalDestination = destination || 'Unknown';

            const routeId = route.route_id || route.route_no || route.id || `${finalOrigin}-${finalDestination}`;

            if (finalOrigin !== 'Unknown' && finalDestination !== 'Unknown') {
                history = history.filter(h => !(h.origin === 'Unknown' && h.destination === 'Unknown') && !(h.route_id === routeId && (h.origin === 'Unknown' || h.destination === 'Unknown')));
            }

            const existingIndex = history.findIndex(h =>
                (h.route_id === routeId && routeId !== 'Unknown') ||
                (h.origin === finalOrigin && h.destination === finalDestination && h.tripType === tripType)
            );

            if (existingIndex !== -1) {
                history[existingIndex].usage += 1;
                history[existingIndex].lastUsed = Date.now();
                history[existingIndex].rawRouteData = { ...history[existingIndex].rawRouteData, ...route };
            } else {
                history.push({
                    route_id: routeId,
                    origin: finalOrigin,
                    destination: finalDestination,
                    usage: 1,
                    tripType,
                    rawRouteData: route,
                    lastUsed: Date.now()
                });
            }

            history.sort((a, b) => b.usage - a.usage);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));

            // Cloud sync to Supabase
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                if (finalOrigin !== 'Unknown' && finalDestination !== 'Unknown') {
                    busService.saveSearchHistory(
                        currentUser.id, 
                        finalOrigin, 
                        finalDestination, 
                        tripType
                    ).catch(err => console.error("Cloud tracking error:", err));
                }
            }
        } catch (error) {
            console.error('Error tracking route usage:', error);
        }
    },

    /**
     * Retrieves the top most used routes.
     */
    getMostUsedRoutes: (limit: number = 5): RouteUsage[] => {
        try {
            const historyJson = localStorage.getItem(STORAGE_KEY);
            if (!historyJson) return [];

            const history: RouteUsage[] = JSON.parse(historyJson);
            return history
                .sort((a, b) => b.usage - a.usage)
                .slice(0, limit);
        } catch (error) {
            console.error('Error retrieving most used routes:', error);
            return [];
        }
    },

    /**
     * Clears history (useful for debugging)
     */
    clearHistory: () => {
        localStorage.removeItem(STORAGE_KEY);
    },

    /**
     * Sync history from cloud to local storage (Supabase version)
     */
    syncWithCloud: async () => {
        try {
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                const cloudHistory = await busService.getSearchHistory(currentUser.id);
                if (cloudHistory && cloudHistory.length > 0) {
                    const historyJson = localStorage.getItem(STORAGE_KEY);
                    let localHistory: RouteUsage[] = historyJson ? JSON.parse(historyJson) : [];
                    
                    cloudHistory.forEach((ch: any) => {
                        const existing = localHistory.find(lh => 
                            lh.origin === ch.from && lh.destination === ch.to && lh.tripType === (ch.trip_type || 'intercity')
                        );
                        if (!existing) {
                            localHistory.push({
                                route_id: `${ch.from}-${ch.to}`,
                                origin: ch.from,
                                destination: ch.to,
                                usage: 1,
                                tripType: ch.trip_type || 'intercity',
                                rawRouteData: {},
                                lastUsed: ch.created_at ? new Date(ch.created_at).getTime() : Date.now()
                            });
                        }
                    });
                    
                    localHistory.sort((a, b) => b.usage - a.usage);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(localHistory.slice(0, 20)));
                }
            }
        } catch (error) {
            console.error('Error syncing cloud route history:', error);
        }
    }
};
