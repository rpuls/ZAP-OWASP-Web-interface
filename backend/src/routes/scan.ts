import { Router, Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { ScanRequest } from '../types';
import { scanService } from '../services/scanService';
import { zapService } from '../services/zapService';


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
    
    // First, start spider scan
    const spiderScanId = await zapService.startSpiderScan(scanTargetUrl);
    
    // Then start active scan
    const activeScanId = await zapService.startActiveScan(scanTargetUrl);
    
    // Create scan entry and store initial metadata
    const scanData = await scanService.createScan(scanTargetUrl);
    console.log('scanData:', scanData);
    
    // Update with spider scan ID and status
    await scanService.updateScan(scanData.uuid, {
      status: 'spider-scanning',
      spiderScanId: spiderScanId
    });
    console.log('Scan metadata updated with spider scan ID');
    
    // Wait for spider to complete
    await zapService.waitForSpiderToComplete(spiderScanId);
    
    // Update with active scan ID
    await scanService.updateScan(scanData.uuid, {
      status: 'active-scanning',
      activeScanId: activeScanId,
      progress: 0
    });
    console.log('Scan metadata updated with active scan ID');

    res.json({
      uuid: scanData.uuid,
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

// GET /api/v1/scans/:scanId - Get scan status
router.get('/:uuid', async (req: Request, res: Response) => {
  try {
    const uuid = req.params.uuid;
    console.log('Checking status for scan:', uuid);

    // Get scan metadata
    const scanMetadata = await scanService.getScanMetadata(uuid);
    console.log('Scan metadata:', scanMetadata);
    if (!scanMetadata) {
      return res.status(404).json({
        error: {
          message: 'Scan not found',
          code: 'SCAN_NOT_FOUND'
        }
      });
    }

    // If we're still spider scanning, return early with that status
    if (scanMetadata.status === 'spider-scanning') {
      return res.json({
        uuid,
        status: 0, // Frontend expects 0 for spider scanning
        isComplete: false
      });
    }

    // If we have an error state, return that
    if (scanMetadata.status === 'failed') {
      return res.json({
        uuid,
        status: null,
        isComplete: true,
        error: {
          message: scanMetadata.error || 'Scan failed',
          code: 'SCAN_FAILED'
        }
      });
    }

    // Check active scan status if we have an activeScanId
    if (!scanMetadata.activeScanId) {
      return res.json({
        uuid,
        status: 0,
        isComplete: false
      });
    }
    
    // Check active scan status
    const statusResponse = await zapService.checkActiveScanStatus(scanMetadata.activeScanId);
    console.log('Active scan status response:', statusResponse);

    // Handle invalid or error responses from ZAP
    if (!statusResponse || statusResponse.status === undefined) {
      console.error('Invalid response from ZAP:', statusResponse);
      return res.json({
        uuid,
        status: null,
        isComplete: true,
        error: {
          message: 'Scan failed - Lost connection to ZAP service',
          code: 'ZAP_CONNECTION_ERROR',
          details: statusResponse
        }
      });
    }
    
    // Calculate progress
    const progress = Math.min(statusResponse.status, 100);
    const isComplete = progress >= 100;
    
    // Update with latest progress
    await scanService.updateScan(uuid, {
      progress,
      status: isComplete ? 'completed' : 'active-scanning'
    });
    
    // If scan is complete, mark it as completed in DB and remove from cache
    if (isComplete && progress >= 100) {
      await scanService.completeScan(uuid);
    }

    let results = null;
    if (isComplete) {
      try {
        // Get alerts when complete
        results = await zapService.getAlerts(scanMetadata.activeScanId);
        
        // Save alerts to database if we have results
        if (results && results.length > 0) {
          await scanService.saveAlerts(uuid, results);
        }
      } catch (alertError) {
        console.error('Failed to fetch alerts:', alertError);
        return res.json({
          uuid,
          status: null,
          isComplete: true,
          error: {
            message: 'Scan failed - Unable to fetch results',
            code: 'ALERTS_FETCH_ERROR',
            details: alertError instanceof Error ? alertError.message : 'Unknown error'
          }
        });
      }
    }
    
    res.json({
      uuid,
      status: progress,
      isComplete,
      results
    });
  } catch (error) {
    console.error('Status check error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      res.status(500).json({ 
        error: `Failed to check scan status: ${error.message}`,
        details: error.response?.data
      });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to check scan status' });
    }
  }
});

export const scanRouter = router;
