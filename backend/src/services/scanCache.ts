import { v4 as uuidv4 } from 'uuid';

export type ScanStatus = 'pending' | 'spider-scanning' | 'active-scanning' | 'completed' | 'failed';

export interface ScanMetadata {
  uuid: string;
  url: string;
  startedAt: Date;
  completedAt?: Date;
  status: ScanStatus;
  progress: number;
  spiderScanId?: string;
  activeScanId?: string;
  error?: string;
  scheduleId?: string;
}

export interface AlertCounts {
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ScanSummary {
  uuid: string;
  url: string;
  startedAt: Date;
  completedAt?: Date;
  status: ScanStatus;
  progress: number;
  alertCounts?: AlertCounts;
  totalAlerts?: number;
  duration?: number; // in milliseconds
}

class ScanCacheService {
  private scanMap: Map<string, ScanMetadata> = new Map();

  createScan(url: string): ScanMetadata {
    const scanData: ScanMetadata = {
      uuid: uuidv4(),
      url,
      startedAt: new Date(),
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

  // Get all scans from cache
  getAllScans(): Map<string, ScanMetadata> {
    return new Map(this.scanMap);
  }

  // Optional: Clean up old scans (could be called periodically)
  cleanOldScans(maxAgeHours: number = 24): void {
    const now = new Date();
    for (const [uuid, metadata] of this.scanMap.entries()) {
      const ageHours = (now.getTime() - metadata.startedAt.getTime()) / (1000 * 60 * 60);
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
