import { v4 as uuidv4 } from 'uuid';
import { ScanMetadata, ScanStatus } from '../scanCache';
import { ScanPersistenceInterface } from './persistence.interface';
import { DatabasePersistence } from './database-persistence';
import { dbConnection } from './db-connection';

export class PersistenceService implements ScanPersistenceInterface {
  private scanMap: Map<string, ScanMetadata> = new Map();
  private dbPersistence: DatabasePersistence | null = null;
  
  constructor() {
    // Initialize database persistence if connection is available
    if (dbConnection.isConnected) {
      this.dbPersistence = new DatabasePersistence();
      console.log('Database persistence enabled for completed scans');
    } else {
      console.log('Using memory-only persistence (no database connection)');
    }
  }
  
  // Check if database is available
  get isDatabaseAvailable(): boolean {
    return dbConnection.isConnected && this.dbPersistence !== null;
  }
  
  async createScan(url: string): Promise<ScanMetadata> {
    const scanData: ScanMetadata = {
      uuid: uuidv4(),
      url,
      timestamp: new Date(),
      status: 'pending',
      progress: 0
    };
    
    // Always store in memory
    this.scanMap.set(scanData.uuid, scanData);
    return scanData;
  }
  
  async getScanMetadata(uuid: string): Promise<ScanMetadata | undefined> {
    // First check memory cache
    const cachedScan = this.scanMap.get(uuid);
    if (cachedScan) {
      return cachedScan;
    }
    
    // If not in memory and we have a database, try to retrieve it
    if (this.isDatabaseAvailable) {
      try {
        const dbScan = await this.dbPersistence!.getScanMetadata(uuid);
        if (dbScan) {
          // Store in memory cache for future access
          this.scanMap.set(uuid, dbScan);
          return dbScan;
        }
      } catch (error) {
        console.error(`Failed to retrieve scan ${uuid} from database:`, error);
      }
    }
    
    return undefined;
  }
  
  async updateScan(uuid: string, updates: Partial<ScanMetadata>): Promise<ScanMetadata | undefined> {
    // Get current scan from memory
    const currentScan = this.scanMap.get(uuid);
    if (!currentScan) return undefined;
    
    // Update in memory
    const updatedScan = { ...currentScan, ...updates };
    this.scanMap.set(uuid, updatedScan);
    
    // If scan is completed or failed and we have a database, persist it
    if ((updatedScan.status === 'completed' || updatedScan.status === 'failed') && 
        this.isDatabaseAvailable) {
      try {
        await this.dbPersistence!.updateScan(uuid, updatedScan);
        console.log(`Persisting completed scan ${uuid} to database`);
        
        // Remove from memory cache after successful persistence
        this.scanMap.delete(uuid);
      } catch (error) {
        console.error(`Failed to persist scan ${uuid} to database:`, error);
        // Keep in memory if database persistence fails
      }
    }
    
    return updatedScan;
  }
  
  async cleanOldScans(maxAgeHours: number = 24): Promise<void> {
    const now = new Date();
    
    // Clean memory cache
    for (const [uuid, metadata] of this.scanMap.entries()) {
      const ageHours = (now.getTime() - metadata.timestamp.getTime()) / (1000 * 60 * 60);
      if (ageHours > maxAgeHours) {
        this.scanMap.delete(uuid);
      }
    }
    
    // Clean database if available
    if (this.isDatabaseAvailable) {
      try {
        await this.dbPersistence!.cleanOldScans(maxAgeHours);
        console.log(`Cleaned scans older than ${maxAgeHours} hours from database`);
      } catch (error) {
        console.error('Failed to clean old scans from database:', error);
      }
    }
  }
  
  async getActiveScanId(uuid: string): Promise<string | undefined> {
    const scan = await this.getScanMetadata(uuid);
    return scan?.activeScanId;
  }
}

// Export singleton instance
export const persistence = new PersistenceService();
