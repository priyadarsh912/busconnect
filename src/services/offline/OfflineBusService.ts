import { busService, BusRoute, BusStop } from '../busService';
import { networkManager } from './NetworkManager';
import { syncQueueService, SyncPriority } from './SyncQueueService';
import { sqlService } from './SQLService';
import { v4 as uuidv4 } from 'uuid';

export const offlineBusService = {
  /**
   * Search routes with local caching
   */
  async searchRoutes(sourceName: string, destinationName: string): Promise<BusRoute[]> {
    const cacheKey = `search_${sourceName}_${destinationName}`;
    
    if (networkManager.getStatus()) {
      try {
        const routes = await busService.searchRoutes(sourceName, destinationName);
        // Cache locally for 1 hour
        await sqlService.execute(
          `INSERT OR REPLACE INTO route_cache (id, data, expires_at) VALUES (?, ?, ?)`,
          [cacheKey, JSON.stringify(routes), Date.now() + 3600000]
        );
        return routes;
      } catch (err) {
        console.warn('OfflineBusService: Online fetch failed, falling back to cache');
      }
    }

    // Offline fallback
    const result = await sqlService.query(`SELECT data FROM route_cache WHERE id = ?`, [cacheKey]);
    if (result.values && result.values.length > 0) {
      return JSON.parse(result.values[0].data);
    }

    return [];
  },

  /**
   * Create a booking with offline queueing
   */
  async createBooking(bookingData: {
    user_id: string;
    bus_id: string;
    source_stop_id: string;
    destination_stop_id: string;
    fare: number;
  }) {
    const operationId = uuidv4();
    const enrichedData = { ...bookingData, operation_id: operationId };

    if (networkManager.getStatus()) {
      try {
        const result = await busService.createBooking(enrichedData);
        return { ...result, status: 'confirmed' };
      } catch (err) {
        console.warn('OfflineBusService: Online booking failed, queueing offline');
      }
    }

    // Offline logic
    await sqlService.execute(
      `INSERT INTO bookings (id, user_id, bus_id, source_stop_id, destination_stop_id, fare, status, created_at, operation_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        operationId, 
        bookingData.user_id, 
        bookingData.bus_id, 
        bookingData.source_stop_id, 
        bookingData.destination_stop_id, 
        bookingData.fare,
        'pending_sync',
        Date.now(),
        operationId
      ]
    );

    // Add to sync queue
    await syncQueueService.enqueue('CREATE_BOOKING', enrichedData, SyncPriority.HIGH);

    return { 
      id: operationId, 
      ...bookingData, 
      status: 'pending_sync',
      message: 'Booking saved locally. It will sync automatically when online.'
    };
  },

  /**
   * Sync profile with offline queueing
   */
  async syncUser(uid: string, profile: any) {
    if (networkManager.getStatus()) {
      return await busService.syncUser(uid, profile);
    }

    await syncQueueService.enqueue('UPDATE_PROFILE', { id: uid, ...profile }, SyncPriority.MEDIUM);
    return { id: uid, ...profile, status: 'pending_sync' };
  },

  /**
   * Save search history with offline queueing
   */
  async saveSearchHistory(userId: string, from: string, to: string, tripType: string = 'intercity') {
    const payload = { user_id: userId, "from": from, "to": to, trip_type: tripType };
    
    if (networkManager.getStatus()) {
      try {
        return await busService.saveSearchHistory(userId, from, to, tripType);
      } catch (err) {
        console.warn('OfflineBusService: Save search online failed, queueing');
      }
    }

    return await syncQueueService.enqueue('SAVE_SEARCH', payload, SyncPriority.LOW);
  },

  /**
   * Get user bookings (combine local and remote)
   */
  async getUserBookings(userId: string) {
    let remoteBookings: any[] = [];
    if (networkManager.getStatus()) {
      try {
        remoteBookings = await busService.getUserBookings(userId);
      } catch (err) {
        console.warn('OfflineBusService: Could not fetch remote bookings');
      }
    }

    const localResult = await sqlService.query(
      `SELECT * FROM bookings WHERE user_id = ? AND status = 'pending_sync'`, 
      [userId]
    );
    const localBookings = (localResult.values || []).map(b => ({
      ...b,
      routes: { source: { name: 'Local' }, destination: { name: 'Local' } } // Mock route info for local
    }));

    return [...localBookings, ...remoteBookings];
  }
};
