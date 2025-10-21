import { scheduleService } from './scheduleService';

/**
 * Service responsible for periodically checking and running scheduled scans
 */
class ScheduleRunnerService {
  private checkInterval: NodeJS.Timeout | null = null;
  private intervalMs: number = 60000; // Check every minute by default
  private isRunning: boolean = false;
  private isProcessing: boolean = false; // Lock to prevent concurrent processing
  
  /**
   * Start the schedule runner
   * @param intervalMs Optional interval in milliseconds between checks
   */
  start(intervalMs?: number) {
    if (this.isRunning) {
      console.log('Schedule runner is already running');
      return;
    }
    
    if (intervalMs) {
      this.intervalMs = intervalMs;
    }
    
    // Clear any existing interval
    this.stop();
    
    // Set up the interval to check for due schedules
    this.checkInterval = setInterval(() => {
      this.checkAndRunDueSchedules();
    }, this.intervalMs);
    
    this.isRunning = true;
    console.log(`Schedule runner started, checking every ${this.intervalMs / 1000} seconds`);
    
    // Run an initial check immediately
    this.checkAndRunDueSchedules();
  }
  
  /**
   * Stop the schedule runner
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.isRunning = false;
      console.log('Schedule runner stopped');
    }
  }
  
  /**
   * Check for due schedules and run them
   */
  async checkAndRunDueSchedules() {
    // If already processing, skip this check
    if (this.isProcessing) {
      console.log('Already processing schedules, skipping this check');
      return;
    }
    
    try {
      // Set the lock
      this.isProcessing = true;
      console.log('Checking for due schedules...');
      await scheduleService.processDueSchedules();
    } catch (error) {
      console.error('Error checking for due schedules:', error);
    } finally {
      // Release the lock
      this.isProcessing = false;
    }
  }
  
  /**
   * Get the current status of the schedule runner
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.intervalMs
    };
  }
}

// Export singleton instance
export const scheduleRunnerService = new ScheduleRunnerService();
