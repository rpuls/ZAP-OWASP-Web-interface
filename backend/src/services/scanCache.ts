import { v4 as uuidv4 } from 'uuid';
import { Scan } from '@prisma/client';

export type ScanStatus = 'pending' | 'pinging-target' | 'spider-scanning' | 'active-scanning' | 'completed' | 'failed';

// Define in-progress statuses for easier filtering
export const IN_PROGRESS_STATUSES: ScanStatus[] = ['pending', 'pinging-target', 'spider-scanning', 'active-scanning'];
export const COMPLETED_STATUSES: ScanStatus[] = ['completed', 'failed'];

// Helper function to check if a scan is in progress
export function isInProgress(status: ScanStatus): boolean {
  return IN_PROGRESS_STATUSES.includes(status);
}

// Helper function to check if a scan is completed
export function isCompleted(status: ScanStatus): boolean {
  return COMPLETED_STATUSES.includes(status);
}

// export interface Scan {
//   uuid: string;
//   url: string;
//   startedAt: Date;
//   completedAt?: Date;
//   status: ScanStatus;
//   progress: number;
//   spiderScanId?: string;
//   activeScanId?: string;
//   error?: string;
//   scheduleId?: string;
// }

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
  private scanMap: Map<string, Scan> = new Map();

  createScan(url: string): Scan {
    const scanData: Scan = {
      uuid: uuidv4(),
      url,
      startedAt: new Date(),
      completedAt: null,
      status: 'pending',
      progress: 0,
      spiderScanId: null,
      activeScanId: null,
      error: null,
      scheduleId: null,
      lastCheckedAt: new Date()
    };
    
    this.scanMap.set(scanData.uuid, scanData);
    return scanData;
  }

  getScan(uuid: string): Scan | undefined {
    return this.scanMap.get(uuid);
  }

  updateScan(uuid: string, updates: Partial<Scan>): Scan | undefined {
    const scan = this.scanMap.get(uuid);
    if (!scan) return undefined;

    const updatedScan = { ...scan, ...updates };
    this.scanMap.set(uuid, updatedScan);
    return updatedScan;
  }

  // Get all scans from cache
  getAllScans(): Map<string, Scan> {
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
    const activeScanId = this.scanMap.get(uuid)?.activeScanId;
    return activeScanId ?? undefined;
  }
}

// Export singleton instance
export const scanCache = new ScanCacheService();
