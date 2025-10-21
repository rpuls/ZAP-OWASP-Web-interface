import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { scheduleService, ScheduleCreateInput, ScheduleUpdateInput } from '../services/scheduleService';
import { scheduleRunnerService } from '../services/scheduleRunnerService';

const router = Router();

// Input validation schemas
const ScheduleCreateSchema = z.object({
  url: z.string().url(),
  name: z.string().optional(),
  startTime: z.string().transform(val => new Date(val)),
  repeatPattern: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  isActive: z.boolean().optional()
});

const ScheduleUpdateSchema = ScheduleCreateSchema.partial();

// GET /api/v1/schedules - Get all schedules
router.get('/', async (_req: Request, res: Response) => {
  try {
    const schedules = await scheduleService.getAllSchedules();
    res.json({ schedules });
  } catch (error) {
    console.error('Failed to fetch schedules:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch schedules' 
    });
  }
});

// GET /api/v1/schedules/runner/status - Get schedule runner status
router.get('/runner/status', (_req: Request, res: Response) => {
  try {
    const status = scheduleRunnerService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to get schedule runner status:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get schedule runner status' 
    });
  }
});

// POST /api/v1/schedules/runner/check - Manually trigger a check for due schedules
router.post('/runner/check', async (_req: Request, res: Response) => {
  try {
    await scheduleRunnerService.checkAndRunDueSchedules();
    res.json({ message: 'Check for due schedules triggered successfully' });
  } catch (error) {
    console.error('Failed to trigger check for due schedules:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to trigger check for due schedules' 
    });
  }
});

// GET /api/v1/schedules/:id - Get a specific schedule
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(schedule);
  } catch (error) {
    console.error(`Failed to fetch schedule ${req.params.id}:`, error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch schedule' 
    });
  }
});

// POST /api/v1/schedules - Create a new schedule
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = ScheduleCreateSchema.parse(req.body);
    
    const schedule = await scheduleService.createSchedule(validatedData as ScheduleCreateInput);
    res.status(201).json(schedule);
  } catch (error) {
    console.error('Failed to create schedule:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    
    // Check for overlap error
    if (error instanceof Error && error.message.includes('overlaps')) {
      return res.status(409).json({ 
        error: 'Schedule overlaps with existing schedules',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create schedule' 
    });
  }
});

// PUT /api/v1/schedules/:id - Update a schedule
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const validatedData = ScheduleUpdateSchema.parse(req.body);
    
    const schedule = await scheduleService.updateSchedule(
      req.params.id, 
      validatedData as ScheduleUpdateInput
    );
    
    res.json(schedule);
  } catch (error) {
    console.error(`Failed to update schedule ${req.params.id}:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    
    if (error instanceof Error) {
      if (error.message === 'Schedule not found') {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      if (error.message.includes('overlaps')) {
        return res.status(409).json({ 
          error: 'Schedule overlaps with existing schedules',
          message: error.message
        });
      }
    }
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update schedule' 
    });
  }
});

// DELETE /api/v1/schedules/:id - Delete a schedule
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await scheduleService.deleteSchedule(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`Failed to delete schedule ${req.params.id}:`, error);
    
    if (error instanceof Error && error.message === 'Schedule not found') {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete schedule' 
    });
  }
});


export const scheduleRouter = router;
