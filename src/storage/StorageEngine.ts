import * as fs from 'fs';
import * as path from 'path';
import { Record, DatabaseConfig, WALEntry } from '../types';
import { WriteAheadLog } from './WAL';

export class StorageEngine { 
    private data: Map<string, Record> = new Map();
    private config: DatabaseConfig;
    private wal: WriteAheadLog;
    private snapshotPath: string;
    
    constructor(config: Partial<DatabaseConfig> = {}) { 
        this.config = { 
            dataDir: config.dataDir || './data',
            walEnabled: config.walEnabled ?? true,
            syncOnWrite: config.syncOnWrite ?? true,
        }
        this.wal = new WriteAheadLog(this.config.dataDir);
        this.snapshotPath = path.join(this.config.dataDir, 'snapshot.db');
    }

    async init(): Promise<void> { 
        if (!fs.existsSync(this.config.dataDir)) {
            fs.mkdirSync(this.config.dataDir, { recursive: true });
        }

        await this.loadSnapshot();

        if (this.config.walEnabled) { 
            await this.wal.init();
            const entries = await this.wal.recover();
            console.log(`Recovering ${entries.length} entries from WAL...`);

            for (const entry of entries) { 
                this.applyWALEntry(entry);
            }

            if (entries.length > 0) { 
                await this.saveSnapshot();
                await this.wal.checkpoint();
            }
        }
        console.log(`Database initialized with ${this.data.size} records.`);
    }

    private applyWALEntry(entry: WALEntry): void { 
        if (entry.operation === 'SET') { 
            this.data.set(entry.key, { 
                key: entry.key,
                value: entry.value,
                timestamp: entry.timestamp,
            });
        } else if (entry.operation === 'DELETE') { 
            this.data.delete(entry.key);
        }
    }

    async get(key: string): Promise<any | null> { 
        const record = this.data.get(key);
        return record ? record.value : null;
    }

    async set(key: string, value: any): Promise<void> { 
        const timestamp = Date.now();

        if (this.config.walEnabled) { 
            await this.wal.append({ 
                operation: 'SET',
                key,
                value,
                timestamp,
            });
        }
        this.data.set(key, { key, value, timestamp });
    }

    async delete(key: string): Promise<boolean> {
        if (!this.data.has(key)) {
          return false;
        }
    
        const timestamp = Date.now();
    
        // Write to WAL first
        if (this.config.walEnabled) {
          await this.wal.append({
            operation: 'DELETE',
            key,
            timestamp,
          });
        }
    
        // Then delete from memory
        this.data.delete(key);
        return true;
    }

    async keys(pattern?: string): Promise<string[]> {
        const allKeys = Array.from(this.data.keys());
        
        if (!pattern) {
          return allKeys;
        }
    
        // Simple wildcard matching
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return allKeys.filter(key => regex.test(key));
    }

    async has(key: string): Promise<boolean> {
        return this.data.has(key);
      }
    
    async size(): Promise<number> {
        return this.data.size;
    }
    
    async getAll(): Promise<Record[]> {
        return Array.from(this.data.values());
    }

    private async loadSnapshot(): Promise<void> {
        if (!fs.existsSync(this.snapshotPath)) {
          return;
        }
    
        try {
          const content = fs.readFileSync(this.snapshotPath, 'utf-8');
          const records: Record[] = JSON.parse(content);
          
          for (const record of records) {
            this.data.set(record.key, record);
          }
        } catch (e) {
          console.warn('Failed to load snapshot, starting fresh:', e);
        }
    }

    async saveSnapshot(): Promise<void> {
        const records = Array.from(this.data.values());
        const content = JSON.stringify(records, null, 2);
        fs.writeFileSync(this.snapshotPath, content);
        console.log(`Snapshot saved with ${records.length} records.`);
      }
    
    async checkpoint(): Promise<void> {
        await this.saveSnapshot();
        if (this.config.walEnabled) {
          await this.wal.checkpoint();
        }
    }
    
    async close(): Promise<void> {
        await this.saveSnapshot();
        this.wal.close();
    }
 }