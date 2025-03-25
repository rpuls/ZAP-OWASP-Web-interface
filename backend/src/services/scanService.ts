import { PrismaClient } from '@prisma/client';
import { scanCache, ScanMetadata, ScanStatus } from './scanCache';
import { dbConnection } from './persistence/db-connection';

class ScanService {
  // Check if database is connected
  private get isDbConnected(): boolean {
    return dbConnection.isConnected;
  }

  // Get Prisma client (may be null)
  private get prisma(): PrismaClient | null {
    return dbConnection.getPrismaClient();
  }

  // Create a new scan
  async createScan(url: string): Promise<ScanMetadata> {
    // Always create in cache first
    const scanData = scanCache.createScan(url);
    
    // If DB connected, also persist to database
    if (this.isDbConnected && this.prisma) {
      try {
        await this.prisma.scan.create({
          data: {
            uuid: scanData.uuid,
            url: scanData.url,
            timestamp: scanData.timestamp,
            status: scanData.status,
            progress: scanData.progress
          }
        });
        console.log(`Scan ${scanData.uuid} persisted to database`);
      } catch (error) {
        console.error('Failed to persist scan to database:', error);
        // Continue with cache-only operation
      }
    }
    
    return scanData;
  }

  // Get scan metadata (from cache or DB)
  async getScanMetadata(uuid: string): Promise<ScanMetadata | undefined> {
    // Try cache first
    const cachedScan = scanCache.getScanMetadata(uuid);
    if (cachedScan) {
      return cachedScan;
    }
    
    // If not in cache but DB connected, try DB
    if (this.isDbConnected && this.prisma) {
      try {
        const dbScan = await this.prisma.scan.findUnique({
          where: { uuid }
        });
        
        if (dbScan) {
          // Convert DB record to ScanMetadata
          return {
            uuid: dbScan.uuid,
            url: dbScan.url,
            timestamp: new Date(dbScan.timestamp),
            status: dbScan.status as ScanStatus,
            progress: dbScan.progress,
            spiderScanId: dbScan.spiderScanId || undefined,
            activeScanId: dbScan.activeScanId || undefined,
            error: dbScan.error || undefined
          };
        }
      } catch (error) {
        console.error('Failed to fetch scan from database:', error);
      }
    }
    
    return undefined;
  }

  // Update scan metadata
  async updateScan(uuid: string, updates: Partial<ScanMetadata>): Promise<ScanMetadata | undefined> {
    // Always update cache
    const updatedScan = scanCache.updateScan(uuid, updates);
    
    // If DB connected, also update DB
    if (this.isDbConnected && this.prisma && updatedScan) {
      try {
        await this.prisma.scan.update({
          where: { uuid },
          data: updates
        });
        console.log(`Scan ${uuid} updated in database`);
      } catch (error) {
        console.error('Failed to update scan in database:', error);
      }
    }
    
    return updatedScan;
  }

  // Complete a scan - update DB and remove from cache
  async completeScan(uuid: string): Promise<void> {
    const scan = scanCache.getScanMetadata(uuid);
    if (!scan) return;
    
    // If DB connected, ensure scan is persisted with final state
    if (this.isDbConnected && this.prisma) {
      try {
        await this.prisma.scan.update({
          where: { uuid },
          data: {
            status: 'completed',
            progress: 100
          }
        });
        console.log(`Scan ${uuid} marked as completed in database`);
        
        // Remove from cache after successful DB update
        // This is implemented by modifying the Map in scanCache
        const scanMapPrivate = (scanCache as any).scanMap;
        if (scanMapPrivate instanceof Map) {
          scanMapPrivate.delete(uuid);
          console.log(`Scan ${uuid} removed from cache`);
        }
      } catch (error) {
        console.error('Failed to complete scan in database:', error);
        // Keep in cache if DB update fails
      }
    }
  }

  // Helper method to get activeScanId by uuid (for compatibility)
  getActiveScanId(uuid: string): string | undefined {
    return scanCache.getActiveScanId(uuid);
  }
}

// Export singleton instance
export const scanService = new ScanService();
