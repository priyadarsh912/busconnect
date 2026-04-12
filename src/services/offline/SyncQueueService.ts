import { sqlService } from './SQLService';
import { v4 as uuidv4 } from 'uuid';

export enum SyncPriority {
  HIGH = 'HIGH',     // Bookings, Payments
  MEDIUM = 'MEDIUM', // Profile updates, Location
  LOW = 'LOW'        // Analytics, Logs
}

export interface SyncItem {
  id: string;
  type: string;
  payload: any;
  priority: SyncPriority;
  timestamp: number;
}

export class SyncQueueService {
  /**
   * Add a new operation to the sync queue
   */
  async enqueue(type: string, payload: any, priority: SyncPriority = SyncPriority.MEDIUM): Promise<string> {
    const id = uuidv4();
    const timestamp = Date.now();
    const payloadStr = JSON.stringify(payload);

    await sqlService.execute(
      `INSERT INTO sync_queue (id, type, payload, priority, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [id, type, payloadStr, priority, timestamp]
    );

    console.log(`SyncQueue: Enqueued ${type} (${id}) with priority ${priority}`);
    return id;
  }

  /**
   * Get all pending items ordered by priority and timestamp
   */
  async getPendingItems(): Promise<SyncItem[]> {
    const result = await sqlService.query(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY 
        CASE priority 
          WHEN 'HIGH' THEN 1 
          WHEN 'MEDIUM' THEN 2 
          WHEN 'LOW' THEN 3 
        END, timestamp ASC`
    );

    return (result.values || []).map((item: any) => ({
      ...item,
      payload: JSON.parse(item.payload)
    }));
  }

  /**
   * Mark an item as processed or increment attempts
   */
  async updateStatus(id: string, status: 'synced' | 'failed', incrementAttempt: boolean = false): Promise<void> {
    if (status === 'synced') {
      await sqlService.execute(`DELETE FROM sync_queue WHERE id = ?`, [id]);
    } else {
      const query = incrementAttempt 
        ? `UPDATE sync_queue SET status = ?, attempts = attempts + 1 WHERE id = ?`
        : `UPDATE sync_queue SET status = ? WHERE id = ?`;
      await sqlService.execute(query, [status, id]);
    }
  }

  /**
   * Clear synced items
   */
  async clearSynced(): Promise<void> {
    await sqlService.execute(`DELETE FROM sync_queue WHERE status = 'synced'`);
  }
}

export const syncQueueService = new SyncQueueService();
