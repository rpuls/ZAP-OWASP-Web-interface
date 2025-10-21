import { scanService } from './scanService';

class ScanHeartbeatMonitorService {
  private checkInterval: NodeJS.Timeout | null = null;
  private intervalMs: number = 300000; // Check every 5 minutes by default
  private staleScanThresholdMs: number = 1800000; // Consider scans stale after 30 minutes of inactivity
  private isRunning: boolean = false;
  
  /**
   * Start the heartbeat monitor
   * @param intervalMs Optional interval in milliseconds between checks
   * @param staleScanThresholdMs Optional threshold in milliseconds to consider a scan stale
   */
  start(intervalMs?: number, staleScanThresholdMs?: number) {
    if (this.isRunning) {
      console.log('Scan heartbeat monitor is already running');
      return;
    }
    
    if (intervalMs) {
      this.intervalMs = intervalMs;
    }
    
    if (staleScanThresholdMs) {
      this.staleScanThresholdMs = staleScanThresholdMs;
    }
    
    // Clear any existing interval
    this.stop();
    
    // Set up the interval to check for stale scans
    this.checkInterval = setInterval(() => {
      this.checkForStaleScans();
    }, this.intervalMs);
    
    this.isRunning = true;
    console.log(`Scan heartbeat monitor started, checking every ${this.intervalMs / 1000} seconds`);
    console.log(`Scans will be considered stale after ${this.staleScanThresholdMs / 1000} seconds of inactivity`);
    
    // Run an initial check immediately
    this.checkForStaleScans();
  }
  
  /**
   * Stop the heartbeat monitor
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.isRunning = false;
      console.log('Scan heartbeat monitor stopped');
    }
  }
  
  /**
   * Check for stale scans and mark them as failed
   */
  async checkForStaleScans() {
    console.log('Checking for stale scans...');
    
    try {
      // Get all active scans
      const activeScans = await scanService.getActiveScans();
      console.log(`Found ${activeScans.length} active scans`);
      
      // Calculate the cutoff time
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - this.staleScanThresholdMs);
      
      let staleScansCount = 0;
      
      // Check each active scan
      for (const scan of activeScans) {
        // If the scan has never been checked or hasn't been checked recently, mark it as stale
        const lastCheckedAt = scan.lastCheckedAt || scan.startedAt;
        
        if (lastCheckedAt < cutoffTime) {
          console.log(`Found stale scan ${scan.uuid}:`);
          console.log(`  Started at: ${scan.startedAt.toISOString()}`);
          console.log(`  Last checked at: ${lastCheckedAt.toISOString()}`);
          console.log(`  Current status: ${scan.status}`);
          console.log(`  Inactivity period: ${(now.getTime() - lastCheckedAt.getTime()) / 1000} seconds`);
          
          try {
            // Mark the scan as failed
            console.log(`Marking scan ${scan.uuid} as failed due to inactivity`);
            await scanService.updateScan(scan.uuid, {
              status: 'failed',
              error: 'Scan interrupted: No activity detected for an extended period',
              completedAt: now // Set completedAt to mark it as finished
            });
            console.log(`Successfully marked scan ${scan.uuid} as failed`);
          } catch (error) {
            console.error(`Failed to mark scan ${scan.uuid} as failed:`, error);
          }
          
          staleScansCount++;
        }
      }
      
      if (staleScansCount > 0) {
        console.log(`Marked ${staleScansCount} stale scans as failed`);
      } else {
        console.log('No stale scans found');
      }
    } catch (error) {
      console.error('Error checking for stale scans:', error);
    }
  }
  
  /**
   * Get the current status of the heartbeat monitor
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.intervalMs,
      staleScanThresholdMs: this.staleScanThresholdMs
    };
  }
}

// Export singleton instance
export const scanHeartbeatMonitor = new ScanHeartbeatMonitorService();
