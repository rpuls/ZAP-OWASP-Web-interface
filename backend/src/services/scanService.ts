import { PrismaClient } from '@prisma/client';
import { scanCache, ScanMetadata, ScanStatus } from './scanCache';
import { dbConnection } from './persistence/db-connection';
import { ZapAlert } from '../types';

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

  // Save alerts to database
  async saveAlerts(scanId: string, alerts: ZapAlert[]): Promise<void> {
    // Only save to database if connected
    if (this.isDbConnected && this.prisma) {
      try {
        // Create alerts in database with relation to scan
        await Promise.all(
          alerts.map((alert: ZapAlert) => 
            this.prisma!.alert.create({
              data: {
                scanId,
                zapId: alert.id,
                name: alert.name,
                risk: alert.risk,
                description: alert.description,
                solution: alert.solution,
                reference: alert.reference,
                url: alert.url,
                evidence: alert.evidence,
                param: alert.param,
                attack: alert.attack,
                other: alert.other,
                confidence: alert.confidence,
                wascid: alert.wascid,
                cweid: alert.cweid,
                tags: alert.tags ? alert.tags : undefined
              }
            })
          )
        );
        console.log(`${alerts.length} alerts saved to database for scan ${scanId}`);
      } catch (error) {
        console.error('Failed to save alerts to database:', error);
      }
    }
  }

  // Get alerts from database
  async getAlertsFromDb(scanId: string): Promise<ZapAlert[] | null> {
    // If DB connected, try to get alerts from DB
    if (this.isDbConnected && this.prisma) {
      try {
        const dbAlerts = await this.prisma.alert.findMany({
          where: { scanId }
        });
        
        if (dbAlerts.length > 0) {
          // Convert DB records to ZapAlert format
          return dbAlerts.map(alert => ({
            id: alert.zapId || alert.id,
            name: alert.name,
            risk: alert.risk,
            description: alert.description,
            solution: alert.solution,
            reference: alert.reference,
            url: alert.url,
            evidence: alert.evidence || undefined,
            param: alert.param || undefined,
            attack: alert.attack || undefined,
            other: alert.other || undefined,
            confidence: alert.confidence || undefined,
            wascid: alert.wascid || undefined,
            cweid: alert.cweid || undefined,
            tags: alert.tags as Record<string, string> || undefined
          }));
        }
      } catch (error) {
        console.error('Failed to fetch alerts from database:', error);
      }
    }
    
    return null; // No alerts found in DB
  }
  
  // Get alerts from the best available source (DB or ZAP)
  async getAlerts(scanId: string, activeScanId?: string): Promise<ZapAlert[]> {
    // First try to get alerts from database if connected
    if (this.isDbConnected) {
      const dbAlerts = await this.getAlertsFromDb(scanId);
      if (dbAlerts && dbAlerts.length > 0) {
        console.log(`Retrieved ${dbAlerts.length} alerts from database for scan ${scanId}`);
        return dbAlerts;
      }
    }
    
    // If no alerts in DB or DB not connected, try ZAP
    if (activeScanId) {
      try {
        const { zapService } = require('./zapService');
        const zapAlerts = await zapService.getAlerts(activeScanId);
        console.log(`Retrieved ${zapAlerts.length} alerts from ZAP for scan ${scanId}`);
        return zapAlerts;
      } catch (error) {
        console.error('Failed to fetch alerts from ZAP:', error);
        throw new Error('Could not retrieve alerts from database or ZAP');
      }
    }
    
    // If we get here, we couldn't get alerts from either source
    throw new Error('Could not retrieve alerts: No database connection and no active scan ID provided');
  }
}

// Export singleton instance
export const scanService = new ScanService();
