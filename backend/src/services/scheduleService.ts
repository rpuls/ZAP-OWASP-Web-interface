import { PrismaClient, Schedule } from '@prisma/client';
import { dbConnection } from './persistence/db-connection';
import { scanService } from './scanService';

export interface ScheduleCreateInput {
  url: string;
  name?: string;
  startTime: Date;
  repeatPattern?: string; // 'none', 'daily', 'weekly', 'monthly'
  isActive?: boolean;
}

export interface ScheduleUpdateInput extends Partial<ScheduleCreateInput> {
  lastRunAt?: Date;
  nextRunAt?: Date;
}

class ScheduleService {
  // Check if database is connected
  private get isDbConnected(): boolean {
    return dbConnection.isConnected;
  }

  // Get Prisma client (may be null)
  private get prisma(): PrismaClient | null {
    return dbConnection.getPrismaClient();
  }

  // Create a new schedule
  async createSchedule(data: ScheduleCreateInput): Promise<Schedule> {
    if (!this.isDbConnected || !this.prisma) {
      throw new Error('Database connection required for scheduling');
    }

    // Set next run time to the same as start time
    const nextRunAt = new Date(data.startTime);

    // Check for overlapping schedules
    await this.checkForOverlaps(data.startTime, nextRunAt, undefined);

    try {
      const schedule = await this.prisma.schedule.create({
        data: {
          url: data.url,
          name: data.name,
          startTime: data.startTime,
          repeatPattern: data.repeatPattern || 'none',
          nextRunAt,
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });
      
      console.log(`Schedule ${schedule.id} created`);
      return schedule;
    } catch (error) {
      console.error('Failed to create schedule:', error);
      throw new Error('Failed to create schedule');
    }
  }

  // Get all schedules
  async getAllSchedules(): Promise<Schedule[]> {
    if (!this.isDbConnected || !this.prisma) {
      throw new Error('Database connection required for scheduling');
    }

    try {
      return await this.prisma.schedule.findMany({
        orderBy: { startTime: 'asc' }
      });
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      throw new Error('Failed to fetch schedules');
    }
  }

  // Get a specific schedule by ID
  async getScheduleById(id: string): Promise<Schedule | null> {
    if (!this.isDbConnected || !this.prisma) {
      throw new Error('Database connection required for scheduling');
    }

    try {
      return await this.prisma.schedule.findUnique({
        where: { id }
      });
    } catch (error) {
      console.error(`Failed to fetch schedule ${id}:`, error);
      throw new Error('Failed to fetch schedule');
    }
  }

  // Update a schedule
  async updateSchedule(id: string, data: ScheduleUpdateInput): Promise<Schedule> {
    if (!this.isDbConnected || !this.prisma) {
      throw new Error('Database connection required for scheduling');
    }

    // Get the current schedule
    const currentSchedule = await this.getScheduleById(id);
    if (!currentSchedule) {
      throw new Error('Schedule not found');
    }

    // Calculate next run time if relevant fields are updated
    let nextRunAt = currentSchedule.nextRunAt;
    let lastRunAt = data.lastRunAt !== undefined ? data.lastRunAt : currentSchedule.lastRunAt;
    
    if (data.startTime || data.repeatPattern !== undefined) {
      const startTime = data.startTime || currentSchedule.startTime;
      const repeatPattern = data.repeatPattern !== undefined ? data.repeatPattern : currentSchedule.repeatPattern;
      const now = new Date();
      
      // If this is a one-time schedule that has already run,
      // and the start time is being updated to a future date,
      // clear the lastRunAt field so it can run again
      if ((!repeatPattern || repeatPattern === 'none') && 
          lastRunAt !== null && 
          data.startTime && 
          data.startTime > now) {
        console.log(`Resetting lastRunAt for one-time schedule ${currentSchedule.id} with new future start time`);
        lastRunAt = null;
      }
      
      nextRunAt = this.calculateNextRunTime(startTime, repeatPattern);
    }

    // Check for overlapping schedules
    if (data.startTime || nextRunAt !== currentSchedule.nextRunAt) {
      await this.checkForOverlaps(
        data.startTime || currentSchedule.startTime,
        nextRunAt,
        id
      );
    }

    try {
      return await this.prisma.schedule.update({
        where: { id },
        data: {
          ...data,
          nextRunAt,
          lastRunAt
        }
      });
    } catch (error) {
      console.error(`Failed to update schedule ${id}:`, error);
      throw new Error('Failed to update schedule');
    }
  }

  // Delete a schedule
  async deleteSchedule(id: string): Promise<void> {
    if (!this.isDbConnected || !this.prisma) {
      throw new Error('Database connection required for scheduling');
    }

    try {
      await this.prisma.schedule.delete({
        where: { id }
      });
      console.log(`Schedule ${id} deleted`);
    } catch (error) {
      console.error(`Failed to delete schedule ${id}:`, error);
      throw new Error('Failed to delete schedule');
    }
  }

  // Check for overlapping schedules
  private async checkForOverlaps(
    startTime: Date,
    endTime: Date | null,
    excludeId?: string
  ): Promise<void> {
    if (!this.prisma) return;

    // If no end time, assume 15 minutes after start time
    const effectiveEndTime = endTime || new Date(startTime.getTime() + 15 * 60 * 1000);
    
    // Find any schedules that overlap with the given time range
    const overlappingSchedules = await this.prisma.schedule.findMany({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        isActive: true,
        OR: [
          // Schedule starts during our time range
          {
            startTime: {
              gte: startTime,
              lt: effectiveEndTime
            }
          },
          // Schedule ends during our time range
          {
            nextRunAt: {
              gt: startTime,
              lte: effectiveEndTime
            }
          },
          // Schedule encompasses our time range
          {
            startTime: { lte: startTime },
            nextRunAt: { gte: effectiveEndTime }
          }
        ]
      }
    });

    if (overlappingSchedules.length > 0) {
      throw new Error('Schedule overlaps with existing schedules');
    }
  }

  // Calculate the next run time based on repeat pattern - simplified version
  private calculateNextRunTime(
    startTime: Date,
    repeatPattern?: string | null
  ): Date {
    // For 'none' or null, next run time is the same as start time
    if (!repeatPattern || repeatPattern === 'none') {
      return new Date(startTime);
    }

    const nextRun = new Date(startTime); // Start with the original start time
    const now = new Date();
    
    // Calculate the next occurrence based on repeat pattern
    switch (repeatPattern) {
      case 'daily':
        // Add days until we get a future date
        while (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
        
      case 'weekly':
        // Add weeks until we get a future date
        while (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
        
      case 'monthly':
        // Add months until we get a future date
        while (nextRun <= now) {
          // Get the current day of month before adding a month
          const currentDay = nextRun.getDate();
          
          // Add a month
          nextRun.setMonth(nextRun.getMonth() + 1);
          
          // Check if the day changed (handles month length differences)
          if (nextRun.getDate() !== currentDay) {
            // If the day changed, it means we landed on a non-existent date
            // (e.g., March 31 -> April 31, which becomes May 1)
            // Set to the last day of the previous month
            nextRun.setDate(0);
          }
        }
        break;
        
      default:
        // For unknown patterns, return start time
        return new Date(startTime);
    }
    
    return nextRun;
  }

  // Process due schedules - simplified version
  async processDueSchedules(): Promise<void> {
    if (!this.isDbConnected || !this.prisma) {
      console.log('Database connection required for processing schedules');
      return;
    }

    const now = new Date();
    console.log(`Checking for due schedules at ${now.toISOString()}`);
    
    try {
      // Find all active schedules that are due to run
      const dueSchedules = await this.prisma.schedule.findMany({
        where: {
          isActive: true,
          OR: [
            // If never run before and start time is in the past or now
            {
              lastRunAt: null,
              startTime: {
                lte: now
              }
            },
            // If has a next run time and it's in the past or now
            // AND it's not a one-time schedule that has already run
            {
              nextRunAt: {
                lte: now
              },
              NOT: {
                repeatPattern: 'none',
                lastRunAt: { not: null }
              }
            }
          ]
        }
      });
      
      console.log(`Found ${dueSchedules.length} schedules due to run`);
      
      // Process each due schedule
      for (const schedule of dueSchedules) {
        try {
          console.log(`Processing schedule ${schedule.id} for URL ${schedule.url}`);
          
          // Calculate the next run time
          const nextRunAt = this.calculateNextRunTime(schedule.startTime, schedule.repeatPattern);
          
          // Update lastRunAt and nextRunAt in a single operation
          await this.prisma.schedule.update({
            where: { id: schedule.id },
            data: {
              lastRunAt: now,
              nextRunAt
            }
          });
          
          console.log(`Updated schedule times: lastRunAt=${now.toISOString()}, nextRunAt=${nextRunAt ? nextRunAt.toISOString() : 'null'}`);
          
          // Start the scan (fire and forget)
          const scan = await scanService.startFullScan(schedule.url);
          
          // Link the scan to the schedule
          await scanService.updateScan(scan.uuid, {
            scheduleId: schedule.id
          });
          
          console.log(`Started scan ${scan.uuid} for schedule ${schedule.id}`);
        } catch (error) {
          console.error(`Failed to process schedule ${schedule.id}:`, error);
          // Continue with next schedule
        }
      }
    } catch (error) {
      console.error('Failed to process due schedules:', error);
    }
  }
}

// Export singleton instance
export const scheduleService = new ScheduleService();
