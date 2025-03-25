import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { ScanMetadata, ScanStatus } from '../scanCache';
import { ScanPersistenceInterface } from './persistence.interface';

import { dbConnection } from './db-connection';

/**
 * This class implements database persistence using Prisma.
 * It will be used when the database connection is available.
 */
export class DatabasePersistence implements ScanPersistenceInterface {
  
  constructor() {
    if (!dbConnection.isConnected) {
      console.warn('Database connection not available, some operations may fail');
    }
  }
  
  // Public getter for connection status
  get isConnected(): boolean {
    return dbConnection.isConnected;
  }
  
  // Helper to get Prisma client
  private get prisma(): PrismaClient {
    const client = dbConnection.getPrismaClient();
    if (!client) {
      throw new Error('Database connection not available');
    }
    return client;
  }
  
  async createScan(url: string): Promise<ScanMetadata> {
    const scanData: ScanMetadata = {
      uuid: uuidv4(),
      url,
      timestamp: new Date(),
      status: 'pending',
      progress: 0
    };
    
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
      
      return scanData;
    } catch (error) {
      console.error('Failed to create scan in database:', error);
      throw error;
    }
  }
  
  async getScanMetadata(uuid: string): Promise<ScanMetadata | undefined> {
    try {
      const scan = await this.prisma.scan.findUnique({
        where: { uuid }
      });
      
      if (!scan) return undefined;
      
      return {
        uuid: scan.uuid,
        url: scan.url,
        timestamp: scan.timestamp,
        status: scan.status as ScanStatus,
        progress: scan.progress,
        spiderScanId: scan.spiderScanId || undefined,
        activeScanId: scan.activeScanId || undefined,
        error: scan.error || undefined
      };
    } catch (error) {
      console.error(`Failed to get scan ${uuid} from database:`, error);
      return undefined;
    }
  }
  
  async updateScan(uuid: string, updates: Partial<ScanMetadata>): Promise<ScanMetadata | undefined> {
    try {
      const updatedScan = await this.prisma.scan.update({
        where: { uuid },
        data: updates
      });
      
      return {
        uuid: updatedScan.uuid,
        url: updatedScan.url,
        timestamp: updatedScan.timestamp,
        status: updatedScan.status as ScanStatus,
        progress: updatedScan.progress,
        spiderScanId: updatedScan.spiderScanId || undefined,
        activeScanId: updatedScan.activeScanId || undefined,
        error: updatedScan.error || undefined
      };
    } catch (error) {
      console.error(`Failed to update scan ${uuid} in database:`, error);
      return undefined;
    }
  }
  
  async cleanOldScans(maxAgeHours: number = 24): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      
      await this.prisma.scan.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });
    } catch (error) {
      console.error('Failed to clean old scans from database:', error);
    }
  }
  
  async getActiveScanId(uuid: string): Promise<string | undefined> {
    try {
      const scan = await this.prisma.scan.findUnique({
        where: { uuid },
        select: { activeScanId: true }
      });
      
      return scan?.activeScanId || undefined;
    } catch (error) {
      console.error(`Failed to get activeScanId for scan ${uuid} from database:`, error);
      return undefined;
    }
  }
}
