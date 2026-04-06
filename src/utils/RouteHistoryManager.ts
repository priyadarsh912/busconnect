// src/utils/RouteHistoryManager.ts
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

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

            // Skip tracking if we have NO useful name information (prevents "Unknown -> Unknown" spam)
            if (!origin && !destination) {
                console.warn('Skipping route tracking: No origin or destination found', route);
                return;
            }

            const finalOrigin = origin || 'Unknown';
            const finalDestination = destination || 'Unknown';

            // Generate a stable ID if not present
            const routeId = route.route_id || route.route_no || route.id || `${finalOrigin}-${finalDestination}`;

            // Clean up existing "Unknown" entries if we're now tracking the same route with better names
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
                // Merge raw data, preserving any explicit coordinates
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


            // Sort by usage and limit to keep storage clean (optional but good practice)
            history.sort((a, b) => b.usage - a.usage);

            // Save back to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));

            // Cloud sync to Firestore
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                // Ignore "Unknown" origins/destinations for cloud analytics
                if (finalOrigin !== 'Unknown' && finalDestination !== 'Unknown') {
                    // Fire and forget
                    firestoreService.saveSearchHistory(
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
     * Sync history from cloud to local storage
     */
    syncWithCloud: async () => {
        try {
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                const cloudHistory = await firestoreService.getRouteHistory(currentUser.id);
                if (cloudHistory && cloudHistory.length > 0) {
                    const historyJson = localStorage.getItem(STORAGE_KEY);
                    let localHistory: RouteUsage[] = historyJson ? JSON.parse(historyJson) : [];
                    
                    cloudHistory.forEach((ch: any) => {
                        const existing = localHistory.find(lh => 
                            lh.origin === ch.from && lh.destination === ch.to && lh.tripType === (ch.tripType || 'intercity')
                        );
                        if (!existing) {
                            localHistory.push({
                                route_id: `${ch.from}-${ch.to}`,
                                origin: ch.from,
                                destination: ch.to,
                                usage: 1,
                                tripType: ch.tripType || 'intercity',
                                rawRouteData: {},
                                lastUsed: ch.searchedAt ? ch.searchedAt.toMillis?.() || Date.now() : Date.now()
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
