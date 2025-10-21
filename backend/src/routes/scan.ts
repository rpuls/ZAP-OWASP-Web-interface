import { Router, Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { ScanRequest } from '../types';
import { scanService } from '../services/scanService';
import { zapService } from '../services/zapService';
import { ScanSummary } from '../services/scanCache';


const router = Router();

// Input validation schema
const ScanRequestSchema = z.object({
  url: z.string().url(),
});

// POST /api/v1/scans - Start a new scan
router.post('/', async (req: ScanRequest, res: Response) => {
  try {
    console.log('Received scan request:', req.body);
    const { url: scanTargetUrl } = ScanRequestSchema.parse(req.body);
    
    const scan = await scanService.startFullScan(scanTargetUrl);

    res.json({
      uuid: scan.uuid,
      status: 'started',
      url: scanTargetUrl,
    });
  } catch (error) {
    console.error('Scan error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid URL provided' });
      return;
    }
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      res.status(500).json({ 
        error: `Failed to start scan: ${error.message}`,
        details: error.response?.data
      });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start scan' });
    }
  }
});

// GET /api/v1/scans/active - Get all active scans
router.get('/active', async (req: Request, res: Response) => {
  try {
    const activeScans = await scanService.getActiveScans();
    
    res.json({
      scans: activeScans
    });
  } catch (error) {
    console.error('Failed to fetch active scans:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch active scans' 
    });
  }
});

// GET /api/v1/scans - Get all scans with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const { scans, total } = await scanService.getAllScans(page, limit);
    
    res.json({
      scans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to fetch scan history:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch scan history' 
    });
  }
});

// GET /api/v1/scans/:scanId - Get scan status
router.get('/:uuid', async (req: Request, res: Response) => {
  try {
    const uuid = req.params.uuid;
    console.log('Checking status for scan:', uuid);

    // Get scan metadata
    const scan = await scanService.getScan(uuid);
    if (!scan) {
      return res.status(404).json({
        error: {
          message: 'Scan not found',
          code: 'SCAN_NOT_FOUND'
        }
      });
    }
    
    // Return the scan object directly
    return res.json(scan);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to check scan status' 
    });
  }
});

// GET /api/v1/scans/:scanId/alerts - Get alerts for a scan
router.get('/:uuid/alerts', async (req: Request, res: Response) => {
  try {
    const uuid = req.params.uuid;
    const scan = await scanService.getScan(uuid);

    if (!scan) {
      return res.status(404).json({
        error: {
          message: 'Scan not found',
          code: 'SCAN_NOT_FOUND'
        }
      });
    }
    
    // Get alerts for the scan
    const alerts = await scanService.getAlerts(uuid, scan.activeScanId ?? undefined);
    
    if (!alerts || alerts.length === 0) {
      return res.status(404).json({
        error: {
          message: 'No alerts found for this scan',
          code: 'ALERTS_NOT_FOUND'
        }
      });
    }
    
    return res.json(alerts);
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      res.status(500).json({ 
        error: `Failed to fetch alerts: ${error.message}`,
        details: error.response?.data
      });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch alerts' });
    }
  }
});

export const scanRouter = router;
