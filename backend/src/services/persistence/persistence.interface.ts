import { ScanMetadata, ScanStatus } from '../scanCache';

export interface ScanPersistenceInterface {
  createScan(url: string): Promise<ScanMetadata>;
  getScanMetadata(uuid: string): Promise<ScanMetadata | undefined>;
  updateScan(uuid: string, updates: Partial<ScanMetadata>): Promise<ScanMetadata | undefined>;
  cleanOldScans(maxAgeHours?: number): Promise<void>;
  getActiveScanId(uuid: string): Promise<string | undefined>;
}
