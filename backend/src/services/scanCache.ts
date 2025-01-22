interface ScanMetadata {
  url: string;
  timestamp: Date;
}

class ScanCacheService {
  private scanMap: Map<string, ScanMetadata> = new Map();

  storeScanMetadata(scanId: string, url: string): void {
    this.scanMap.set(scanId, {
      url,
      timestamp: new Date()
    });
  }

  getScanMetadata(scanId: string): ScanMetadata | undefined {
    return this.scanMap.get(scanId);
  }

  // Optional: Clean up old scans (could be called periodically)
  cleanOldScans(maxAgeHours: number = 24): void {
    const now = new Date();
    for (const [scanId, metadata] of this.scanMap.entries()) {
      const ageHours = (now.getTime() - metadata.timestamp.getTime()) / (1000 * 60 * 60);
      if (ageHours > maxAgeHours) {
        this.scanMap.delete(scanId);
      }
    }
  }
}

// Export singleton instance
export const scanCache = new ScanCacheService();
