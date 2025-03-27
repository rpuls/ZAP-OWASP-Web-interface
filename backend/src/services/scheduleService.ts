import { PrismaClient, Schedule } from '@prisma/client';
import { dbConnection } from './persistence/db-connection';
import { scanService } from './scanService';

export interface ScheduleCreateInput {
  url: string;
  name?: string;
  startTime: Date;
  repeatPattern?: string; // 'none', 'daily', 'weekly', 'monthly'
  repeatDays?: number[];
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

    // Calculate next run time
    const nextRunAt = this.calculateNextRunTime(data.startTime, data.repeatPattern, data.repeatDays);

    // Check for overlapping schedules
    await this.checkForOverlaps(data.startTime, nextRunAt, undefined);

    try {
      const schedule = await this.prisma.schedule.create({
        data: {
          url: data.url,
          name: data.name,
          startTime: data.startTime,
          repeatPattern: data.repeatPattern || 'none',
          repeatDays: data.repeatDays || [],
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
    if (data.startTime || data.repeatPattern !== undefined || data.repeatDays) {
      const startTime = data.startTime || currentSchedule.startTime;
      const repeatPattern = data.repeatPattern !== undefined ? data.repeatPattern : currentSchedule.repeatPattern;
      const repeatDays = data.repeatDays || currentSchedule.repeatDays;
      
      nextRunAt = this.calculateNextRunTime(startTime, repeatPattern, repeatDays);
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
          // Only update repeatDays if provided
          repeatDays: data.repeatDays !== undefined ? data.repeatDays : undefined
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

  // Calculate the next run time based on repeat pattern
  private calculateNextRunTime(
    startTime: Date,
    repeatPattern?: string | null,
    repeatDays?: number[]
  ): Date {
    // For 'none' or null, next run is 15 minutes after start
    if (!repeatPattern || repeatPattern === 'none') {
      return new Date(startTime.getTime() + 15 * 60 * 1000);
    }

    const nextRun = new Date(startTime);
    
    switch (repeatPattern) {
      case 'daily':
        // Next run is 24 hours after start
        nextRun.setDate(nextRun.getDate() + 1);
        break;
        
      case 'weekly':
        if (!repeatDays || repeatDays.length === 0) {
          // Default to same day next week
          nextRun.setDate(nextRun.getDate() + 7);
        } else {
          // Find the next day of the week that matches repeatDays
          // Days are 0-6 (Sunday-Saturday)
          const currentDay = startTime.getDay();
          const nextDays = repeatDays
            .map(d => (d < currentDay ? d + 7 : d)) // Ensure all days are after current day
            .filter(d => d > currentDay)
            .sort((a, b) => a - b);
            
          if (nextDays.length > 0) {
            // Use the next available day
            const daysToAdd = nextDays[0] - currentDay;
            nextRun.setDate(nextRun.getDate() + daysToAdd);
          } else {
            // If no days after current day, use the first day next week
            const daysToAdd = 7 + (repeatDays[0] - currentDay);
            nextRun.setDate(nextRun.getDate() + daysToAdd);
          }
        }
        break;
        
      case 'monthly':
        if (!repeatDays || repeatDays.length === 0) {
          // Default to same day next month
          nextRun.setMonth(nextRun.getMonth() + 1);
        } else {
          // Find the next day of the month that matches repeatDays
          const currentDay = startTime.getDate();
          const nextDays = repeatDays
            .filter(d => d > currentDay)
            .sort((a, b) => a - b);
            
          if (nextDays.length > 0) {
            // Use the next available day this month
            nextRun.setDate(nextDays[0]);
          } else {
            // If no days after current day, use the first day next month
            nextRun.setMonth(nextRun.getMonth() + 1);
            nextRun.setDate(repeatDays[0]);
          }
        }
        break;
        
      default:
        // For unknown patterns, default to 15 minutes after start
        nextRun.setTime(nextRun.getTime() + 15 * 60 * 1000);
    }
    
    return nextRun;
  }

  // Process due schedules - this would be called by a cron job or similar
  async processDueSchedules(): Promise<void> {
    if (!this.isDbConnected || !this.prisma) {
      console.log('Database connection required for processing schedules');
      return;
    }

    const now = new Date();
    console.log(`Checking for due schedules at ${now.toISOString()}`);
    
    try {
      // Find all schedules regardless of start time
      const allSchedules = await this.prisma.schedule.findMany();
      
      console.log(`Found ${allSchedules.length} total schedules in database`);
      
      // Log details of each schedule for debugging
      allSchedules.forEach(schedule => {
        console.log(`Schedule ${schedule.id}:
          URL: ${schedule.url}
          Name: ${schedule.name || 'N/A'}
          Start Time: ${schedule.startTime.toISOString()}
          Repeat Pattern: ${schedule.repeatPattern || 'none'}
          Last Run At: ${schedule.lastRunAt ? schedule.lastRunAt.toISOString() : 'never'}
          Next Run At: ${schedule.nextRunAt ? schedule.nextRunAt.toISOString() : 'N/A'}
          Is Active: ${schedule.isActive ? 'Yes' : 'No'}
        `);
      });
      
      // Filter to only include active schedules
      const activeSchedules = allSchedules.filter(schedule => schedule.isActive);
      
      // Filter to only include schedules that are due to run
      const dueSchedules = activeSchedules.filter(schedule => {
        // If never run before and start time is in the past or now, it's due
        if (!schedule.lastRunAt && schedule.startTime <= now) {
          console.log(`Schedule ${schedule.id} is due: never run before and start time is in the past`);
          return true;
        }
        
        // If has a next run time and it's in the past or now, it's due
        if (schedule.nextRunAt && schedule.nextRunAt <= now) {
          console.log(`Schedule ${schedule.id} is due: next run time ${schedule.nextRunAt.toISOString()} is in the past`);
          return true;
        }
        
        console.log(`Schedule ${schedule.id} is not due to run yet`);
        return false;
      });
      
      console.log(`Found ${dueSchedules.length} schedules due to run out of ${activeSchedules.length} active schedules`);
      
      // Process each due schedule
      for (const schedule of dueSchedules) {
        try {
          console.log(`Processing schedule ${schedule.id} for URL ${schedule.url}`);
          
          // Update the lastRunAt field immediately to prevent duplicate runs
          // even if the server restarts during a scan
          const lastRunAt = now;
          await this.updateSchedule(schedule.id, {
            lastRunAt
          });
          console.log(`Updated lastRunAt for schedule ${schedule.id} to prevent duplicate runs`);
          
          const scan = await scanService.startFullScan(schedule.url);
               // Update the scan with the schedule ID
          await scanService.updateScan(scan.uuid, {
            scheduleId: schedule.id
          });
          
          // Calculate the next run time based on repeat pattern
          const nextRunAt = this.calculateNextRunTime(
            schedule.startTime,
            schedule.repeatPattern,
            schedule.repeatDays
          );
          
          // Update the schedule with the next run time
          await this.updateSchedule(schedule.id, {
            nextRunAt
          });
          
          console.log(`Started scheduled scan ${scan.uuid} for schedule ${schedule.id}`);
          console.log(`Next run scheduled for: ${nextRunAt.toISOString()}`);
        } catch (error) {
          console.error(`Failed to process schedule ${schedule.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process due schedules:', error);
    }
  }
}

// Export singleton instance
export const scheduleService = new ScheduleService();
