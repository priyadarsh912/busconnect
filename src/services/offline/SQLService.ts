import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export class SQLService {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isWeb: boolean = Capacitor.getPlatform() === 'web';
  private dbName: string = 'busconnect_offline';

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initialize(): Promise<void> {
    try {
      if (this.isWeb) {
        console.warn('SQLService: Running in web mode. Persistence might be limited to IndexedDB.');
        // Web fallback initialization could go here if using Jeep-SQLite
      }

      this.db = await this.sqlite!.createConnection(this.dbName, false, 'no-encryption', 1, false);
      await this.db.open();

      await this.createTables();
      console.log('SQLService: Database initialized and tables created.');
    } catch (err) {
      console.error('SQLService: Initialization error:', err);
      throw err;
    }
  }

  private async createTables(): Promise<void> {
    const queries = [
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        priority TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bus_id TEXT NOT NULL,
        source_stop_id TEXT NOT NULL,
        destination_stop_id TEXT NOT NULL,
        fare REAL NOT NULL,
        status TEXT DEFAULT 'locally_created',
        created_at INTEGER NOT NULL,
        operation_id TEXT UNIQUE
      );`,
      `CREATE TABLE IF NOT EXISTS location_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS route_cache (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );`
    ];

    for (const query of queries) {
      await this.db!.execute(query);
    }
  }

  async execute(query: string, params: any[] = []): Promise<any> {
    if (!this.db) await this.initialize();
    return await this.db!.run(query, params);
  }

  async query(query: string, params: any[] = []): Promise<any> {
    if (!this.db) await this.initialize();
    return await this.db!.query(query, params);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.sqlite!.closeConnection(this.dbName, false);
      this.db = null;
    }
  }
}

export const sqlService = new SQLService();
