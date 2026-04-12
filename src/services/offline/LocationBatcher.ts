import { Geolocation } from '@capacitor/geolocation';
import { sqlService } from './SQLService';
import { syncQueueService, SyncPriority } from './SyncQueueService';

export class LocationBatcher {
  private intervalId: any = null;
  private batchSize: number = 20; // Sync every 20 points (~1.5 to 2 mins)
  private points: any[] = [];

  /**
   * Start recording location
   */
  public async startTracking() {
    if (this.intervalId) return;

    // Request permissions first
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted') {
      console.error('LocationBatcher: Permission denied');
      return;
    }

    this.intervalId = setInterval(async () => {
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });

        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp
        };

        await this.savePointLocally(point);
        this.points.push(point);

        if (this.points.length >= this.batchSize) {
          await this.flush();
        }
      } catch (err) {
        console.error('LocationBatcher: Tracking error', err);
      }
    }, 5000); // Record every 5 seconds
  }

  private async savePointLocally(point: any) {
    await sqlService.execute(
      `INSERT INTO location_logs (latitude, longitude, timestamp) VALUES (?, ?, ?)`,
      [point.latitude, point.longitude, point.timestamp]
    );
  }

  public async stopTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      await this.flush(); // Final flush
    }
  }

  private async flush() {
    if (this.points.length === 0) return;

    const payload = [...this.points];
    this.points = [];

    await syncQueueService.enqueue('BATCH_LOCATION', payload, SyncPriority.MEDIUM);
    console.log(`LocationBatcher: Flushed ${payload.length} points to sync queue.`);

    // Optionally clear local logs that were queued
    // In production, you might keep them until the sync engine confirms success
  }
}

export const locationBatcher = new LocationBatcher();
