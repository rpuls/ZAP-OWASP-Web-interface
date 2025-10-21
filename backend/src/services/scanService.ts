import { PrismaClient, Scan } from '@prisma/client';
import { scanCache, ScanStatus, ScanSummary, IN_PROGRESS_STATUSES } from './scanCache';
import { dbConnection } from './persistence/db-connection';
import { zapService } from './zapService';

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
  async createScan(url: string): Promise<Scan> {
    // Always create in cache first
    const scan = scanCache.createScan(url);

    // If DB connected, also persist to database
    if (this.isDbConnected && this.prisma) {
      try {
        await this.prisma.scan.create({
          data: {
            uuid: scan.uuid,
            url: scan.url,
            startedAt: scan.startedAt,
            status: scan.status,
            progress: scan.progress
          }
        });
        console.log(`Scan ${scan.uuid} persisted to database`);
      } catch (error) {
        console.error('Failed to persist scan to database:', error);
        // Continue with cache-only operation
      }
    }

    return scan;
  }

  // Get scan metadata (from cache or DB)
  async getScan(uuid: string): Promise<Scan | undefined> {
    // Try cache first
    const cachedScan = scanCache.getScan(uuid);
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
          // Convert DB record to Scan
          return {
            uuid: dbScan.uuid,
            url: dbScan.url,
            startedAt: new Date(dbScan.startedAt),
            completedAt: dbScan.completedAt ? new Date(dbScan.completedAt) : null,
            status: dbScan.status as ScanStatus,
            progress: dbScan.progress,
            spiderScanId: dbScan.spiderScanId ?? null,
            activeScanId: dbScan.activeScanId ?? null,
            error: dbScan.error ?? null,
            scheduleId: dbScan.scheduleId ?? null,
            lastCheckedAt: dbScan.lastCheckedAt ? new Date(dbScan.lastCheckedAt) : null
          };
        }
      } catch (error) {
        console.error('Failed to fetch scan from database:', error);
      }
    }

    return undefined;
  }

  // Update scan metadata
  async updateScan(uuid: string, updates: Partial<Scan>): Promise<Scan | undefined> {
    // Don't update lastCheckedAt if we're marking the scan as failed or completed
    const updateLastChecked = updates.status !== 'failed' && updates.status !== 'completed';
    
    // Always update cache
    const updatedScan = scanCache.updateScan(uuid, updates);

    // If DB connected, also update DB
    if (this.isDbConnected && this.prisma && updatedScan) {
      try {
        await this.prisma.scan.update({
          where: { uuid },
          data: {
            ...updates,
            ...(updateLastChecked ? { lastCheckedAt: new Date() } : {})
          }
        });
        
        console.log(`Scan ${uuid} updated in database (status: ${updates.status})`);
      } catch (error) {
        console.error('Failed to update scan in database:', error);
      }
    }

    return updatedScan;
  }

  // Complete a scan - update DB and remove from cache
  async completeScan(uuid: string): Promise<void> {
    const scan = scanCache.getScan(uuid);
    if (!scan) return;
    const completedAt = new Date();

    // Update scan in cache with completedAt
    scanCache.updateScan(uuid, {
      completedAt,
      status: 'completed',
      progress: 100
    });

    // If DB connected, ensure scan is persisted with final state
    if (this.isDbConnected && this.prisma) {
      try {
        await this.prisma.scan.update({
          where: { uuid },
          data: {
            status: 'completed',
            progress: 100,
            completedAt
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
  
  // Get all active scans (status is not 'completed' or 'failed')
  async getActiveScans(): Promise<Scan[]> {
    const activeScans: Scan[] = [];
    
    // Get in-progress scans from cache
    const cacheScans = Array.from(scanCache.getAllScans().values());
    const activeFromCache = cacheScans.filter(scan => IN_PROGRESS_STATUSES.includes(scan.status as ScanStatus));
    activeScans.push(...activeFromCache);
    
    // If DB connected, also get active scans from DB
    if (this.isDbConnected && this.prisma) {
      try {
        const dbScans = await this.prisma.scan.findMany({
          where: {
            status: {
              in: IN_PROGRESS_STATUSES,
            }
          },
          orderBy: {
            progress: 'desc'
          }
        });
        
        // Add DB scans that aren't already in the list from cache
        for (const dbScan of dbScans) {
          if (!activeScans.some(scan => scan.uuid === dbScan.uuid)) {
            activeScans.push({
              uuid: dbScan.uuid,
              url: dbScan.url,
              startedAt: new Date(dbScan.startedAt),
              completedAt: dbScan.completedAt ? new Date(dbScan.completedAt) : null,
              status: dbScan.status as ScanStatus,
              progress: dbScan.progress,
              spiderScanId: dbScan.spiderScanId,
              activeScanId: dbScan.activeScanId,
              error: dbScan.error,
              scheduleId: dbScan.scheduleId,
              lastCheckedAt: dbScan.lastCheckedAt ? new Date(dbScan.lastCheckedAt) : null
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch active scans from database:', error);
      }
    }
    
    // Sort by progress (highest first)
    return activeScans.sort((a, b) => b.progress - a.progress);
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

  // Get all scans with pagination
  async getAllScans(page: number = 1, limit: number = 10): Promise<{
    scans: ScanSummary[];
    total: number;
  }> {
    const results: ScanSummary[] = [];
    let total = 0;

    // Get from database if connected
    if (this.isDbConnected && this.prisma) {
      try {
        // Get total count
        total = await this.prisma.scan.count();

        // Get paginated results
        const dbScans = await this.prisma.scan.findMany({
          orderBy: { startedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            // Include alert counts
            _count: {
              select: { alerts: true }
            }
          }
        });

        // Convert DB records to ScanSummary format with duration and alert counts
        for (const scan of dbScans) {
          // Get alert counts by risk level
          const alerts = await this.prisma.alert.findMany({
            where: { scanId: scan.uuid },
            select: { risk: true }
          });

          const alertCounts = {
            high: alerts.filter(a => a.risk === 'High').length,
            medium: alerts.filter(a => a.risk === 'Medium').length,
            low: alerts.filter(a => a.risk === 'Low').length,
            info: alerts.filter(a => a.risk === 'Informational').length,
          };

          // Calculate duration if scan is completed
          let duration = undefined;
          if (scan.status === 'completed' && scan.completedAt) {
            duration = new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime();
          }

          results.push({
            uuid: scan.uuid,
            url: scan.url,
            startedAt: new Date(scan.startedAt),
            completedAt: scan.completedAt ? new Date(scan.completedAt) : undefined,
            status: scan.status as ScanStatus,
            progress: scan.progress,
            alertCounts,
            totalAlerts: scan._count.alerts,
            duration
          });
        }
      } catch (error) {
        console.error('Failed to fetch scans from database:', error);
      }
    }

    // Get from cache and merge (avoiding duplicates)
    const cacheScans = Array.from(scanCache.getAllScans().values());
    for (const cacheScan of cacheScans) {
      if (!results.some(scan => scan.uuid === cacheScan.uuid)) {
        // For cache items, we don't have alert counts, so we'll set them to 0
        results.push({
          uuid: cacheScan.uuid,
          url: cacheScan.url,
          startedAt: cacheScan.startedAt,
          completedAt: cacheScan.completedAt ?? undefined,
          status: cacheScan.status as ScanStatus,
          progress: cacheScan.progress,
          alertCounts: { high: 0, medium: 0, low: 0, info: 0 },
          totalAlerts: 0,
          duration: cacheScan.completedAt ?
            cacheScan.completedAt.getTime() - cacheScan.startedAt.getTime() : undefined
        });
      }
    }

    // Sort by startedAt (newest first)
    results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    return {
      scans: results.slice((page - 1) * limit, page * limit),
      total: Math.max(total, results.length)
    };
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

  async startFullScan(url: string): Promise<Scan> {
    const scan = await this.createScan(url);
    this.processFullScan(scan);
    return scan;
  }

  async processFullScan(scan: Scan): Promise<void> {
    // First, check if the URL is reachable
    await this.updateScan(scan.uuid, {
      status: 'pinging-target'
    });
    const isReachable = await zapService.isUrlReachable(scan.url);
    
    if (!isReachable) {
      console.error(`URL ${scan.url} is not reachable`);
      await this.updateScan(scan.uuid, {
        status: 'failed',
        error: 'Unable to reach website. Please verify that the site you are trying to scan is online.'
      });
      return;
    }
    
    // Start spider scan
    console.log(`Starting spider scan for scan ${scan.uuid}`);
    const spiderScanId = await zapService.startSpiderScan(scan.url);

    // Update with spider scan ID and status
    await this.updateScan(scan.uuid, {
      status: 'spider-scanning',
      spiderScanId: spiderScanId
    });
    console.log(`Scan metadata updated with spider scan ID: ${spiderScanId}`);

    // Wait for spider to complete
    await zapService.waitForSpiderToComplete(spiderScanId);
    console.log(`Spider scan completed for scan ${scan.uuid}`);

    // Wait for URL to exist in scan tree
    const urlInScanTree = await zapService.waitForUrlToExistInScanTree(scan.url);
    if (!urlInScanTree) {
      console.error(`URL ${scan.url} not found in scan tree after spider scan`);
      await this.updateScan(scan.uuid, {
        status: 'failed',
        error: 'URL not found in scan tree after spider scan'
      });
      return;
    }

    // Only start active scan after spider scan is complete and URL is in scan tree
    const activeScanId = await zapService.startActiveScan(scan.url);

    // Update with active scan ID
    await this.updateScan(scan.uuid, {
      status: 'active-scanning',
      activeScanId: activeScanId,
      progress: 0
    });
    console.log(`Active scan started with ID: ${activeScanId}`);

    // Wait for active scan to complete
    console.log(`Waiting for active scan to complete...`);
    let isComplete = false;
    let progress = 0;

    while (!isComplete) {
      const statusResponse = await zapService.checkActiveScanStatus(activeScanId);
      progress = Math.min(statusResponse.status, 100);
      isComplete = progress >= 100;

      await this.updateScan(scan.uuid, {
        progress,
        status: isComplete ? 'completed' : 'active-scanning'
      });

      if (!isComplete) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Active scan completed for scheduled scan ${scan.uuid}`);

    const alerts = await zapService.getAlerts(activeScanId);
    if (alerts && alerts.length > 0) {
      await this.saveAlerts(scan.uuid, alerts);
    }

    // Mark scan as completed
    await this.completeScan(scan.uuid);
    console.log(`Marked scheduled scan ${scan.uuid} as completed`);
  }
}


// Export singleton instance
export const scanService = new ScanService();
