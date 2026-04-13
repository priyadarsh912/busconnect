import { networkManager } from './NetworkManager';
import { syncQueueService, SyncPriority, SyncItem } from './SyncQueueService';
import { supabase } from '../../lib/supabase';
import { analyticsService } from '../AnalyticsService';

export class SyncEngine {
  private isSyncing: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    networkManager.onStatusChange((isOnline) => {
      if (isOnline) {
        console.log('SyncEngine: Online detected. Starting sync...');
        this.processQueue();
      }
    });

    // Background sync: Check for pending items every 5 seconds if online
    setInterval(() => {
      if (networkManager.getStatus()) {
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * Main processing loop
   */
  public async processQueue(): Promise<void> {
    if (this.isSyncing || !networkManager.getStatus()) return;

    this.isSyncing = true;
    try {
      const items = await syncQueueService.getPendingItems();
      
      if (items.length === 0) {
        console.log('SyncEngine: Queue is empty.');
        return;
      }

      console.log(`SyncEngine: Processing ${items.length} items...`);
      analyticsService.logEvent('sync_started', { queue_depth: items.length });

      for (const item of items) {
        if (!networkManager.getStatus()) break; // Stop if offline again

        const success = await this.syncItem(item);
        if (success) {
          await syncQueueService.updateStatus(item.id, 'synced');
        } else {
          // If a high priority item fails, we might want to stop the whole queue 
          // to prevent sequence issues (e.g. payment before booking confirmation)
          await syncQueueService.updateStatus(item.id, 'failed', true);
          if (item.priority === SyncPriority.HIGH) {
            console.error('SyncEngine: High priority item failed. Halting queue.');
            break;
          }
        }
      }
      analyticsService.logEvent('sync_success', { processed_count: items.length });
    } catch (err: any) {
      console.error("SyncEngine error:", err);
      analyticsService.logEvent('sync_failed', { error: err.message });
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: SyncItem): Promise<boolean> {
    try {
      console.log(`SyncEngine: Syncing ${item.type} (${item.id})`);

      switch (item.type) {
        case 'CREATE_BOOKING':
          return await this.handleCreateBooking(item.payload);
        
        case 'UPDATE_PROFILE':
          return await this.handleUpdateProfile(item.payload);
        
        case 'SAVE_SEARCH':
          return await this.handleSaveSearch(item.payload);
        
        case 'BATCH_LOCATION':
          return await this.handleBatchLocation(item.payload);

        case 'ANALYTICS':
          return await this.handleAnalyticsSync(item.payload);

        default:
          console.warn(`SyncEngine: Unknown item type ${item.type}`);
          return true; // Skip unknown
      }
    } catch (err) {
      console.error(`SyncEngine: Error syncing ${item.id}:`, err);
      return false;
    }
  }

  // --- Handlers ---

  private async handleCreateBooking(payload: any): Promise<boolean> {
    const { data, error } = await supabase
      .from('bookings')
      .insert([payload]);
    
    if (error) {
      // Handle "Duplicate" error (idempotency)
      if (error.code === '23505') return true; 
      throw error;
    }
    return true;
  }

  private async handleUpdateProfile(payload: any): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .upsert(payload);
    
    if (error) throw error;
    return true;
  }

  private async handleSaveSearch(payload: any): Promise<boolean> {
    const { error } = await supabase
      .from('search_history')
      .insert([payload]);
    
    if (error) throw error;
    return true;
  }

  private async handleBatchLocation(payload: any): Promise<boolean> {
    // In a real production app, you might have a dedicated batch endpoint
    // For now, we perform a multi-insert
    const { error } = await supabase
      .from('location_logs')
      .insert(payload);
    
    if (error) throw error;
    return true;
  }

  private async handleAnalyticsSync(payload: any): Promise<boolean> {
    const { error } = await supabase
      .from('analytics_events')
      .insert([{
        event_name: payload.event_name,
        user_id: payload.user_id,
        properties: payload.properties,
        network_status: 'offline', // Mark as having come from offline
        timestamp: new Date(payload.timestamp * 1000).toISOString()
      }]);
    
    if (error) {
      console.warn("SyncEngine: Analytics sync failed", error);
      // We don't want analytics failures to block the queue, so we return true 
      // but maybe we should retry once. For now, true is safer.
      return true; 
    }
    return true;
  }
}

export const syncEngine = new SyncEngine();
