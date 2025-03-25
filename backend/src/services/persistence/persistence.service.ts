import { v4 as uuidv4 } from 'uuid';
import { ScanMetadata, ScanStatus } from '../scanCache';
import { ScanPersistenceInterface } from './persistence.interface';

// Check if DATABASE_URL is defined in the environment
const db = process.env.DATABASE_URL ? true : false;

export class PersistenceService implements ScanPersistenceInterface {
  private scanMap: Map<string, ScanMetadata> = new Map();
  private useDatabase: boolean;
  
  constructor() {
    // Check if database should be used
    this.useDatabase = db;
    
    if (this.useDatabase) {
      console.log('Database persistence enabled for completed scans');
    } else {
      console.log('Using memory-only persistence (no DATABASE_URL defined)');
    }
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
    if (this.useDatabase) {
      try {
        // This is a placeholder for database retrieval
        // Will be implemented when we add Prisma
        console.log(`Attempting to retrieve scan ${uuid} from database`);
        
        // For now, return undefined as if not found in database
        return undefined;
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
        this.useDatabase) {
      try {
        // This is a placeholder for database persistence
        // Will be implemented when we add Prisma
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
    if (this.useDatabase) {
      try {
        // This is a placeholder for database cleanup
        // Will be implemented when we add Prisma
        console.log(`Cleaning scans older than ${maxAgeHours} hours from database`);
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
