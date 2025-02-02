import { v4 as uuidv4 } from 'uuid';

export type ScanStatus = 'pending' | 'spider-scanning' | 'active-scanning' | 'completed' | 'failed';

export interface ScanMetadata {
  uuid: string;
  url: string;
  timestamp: Date;
  status: ScanStatus;
  progress: number;
  spiderScanId?: string;
  activeScanId?: string;
  error?: string;
}

class ScanCacheService {
  private scanMap: Map<string, ScanMetadata> = new Map();

  createScan(url: string): ScanMetadata {
    const scanData: ScanMetadata = {
      uuid: uuidv4(),
      url,
      timestamp: new Date(),
      status: 'pending',
      progress: 0
    };
    
    this.scanMap.set(scanData.uuid, scanData);
    return scanData;
  }

  getScanMetadata(uuid: string): ScanMetadata | undefined {
    return this.scanMap.get(uuid);
  }

  updateScan(uuid: string, updates: Partial<ScanMetadata>): ScanMetadata | undefined {
    const scan = this.scanMap.get(uuid);
    if (!scan) return undefined;

    const updatedScan = { ...scan, ...updates };
    this.scanMap.set(uuid, updatedScan);
    return updatedScan;
  }

  // Optional: Clean up old scans (could be called periodically)
  cleanOldScans(maxAgeHours: number = 24): void {
    const now = new Date();
    for (const [uuid, metadata] of this.scanMap.entries()) {
      const ageHours = (now.getTime() - metadata.timestamp.getTime()) / (1000 * 60 * 60);
      if (ageHours > maxAgeHours) {
        this.scanMap.delete(uuid);
      }
    }
  }

  // Helper method to get activeScanId by uuid
  getActiveScanId(uuid: string): string | undefined {
    return this.scanMap.get(uuid)?.activeScanId;
  }
}

// Export singleton instance
export const scanCache = new ScanCacheService();
