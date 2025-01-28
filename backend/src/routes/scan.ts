import { Router, Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { ScanRequest, ZapScanResponse, ZapStatusResponse } from '../types';
import { scanCache, ScanStatus } from '../services/scanCache';

// Get public URL from environment
const publicUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.PUBLIC_URL || 'http://localhost:3001';

const router = Router();

// Input validation schema
const ScanRequestSchema = z.object({
  url: z.string().url(),
});

async function waitForSpiderToComplete(spiderId: string): Promise<void> {
  while (true) {
    const response = await axios.get<{ status: number }>('/zap/JSON/spider/view/status/', {
      baseURL: publicUrl,
      params: { scanId: spiderId },
      timeout: 30000,
      validateStatus: null
    });

    if (response.data.status >= 100) {
      break;
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// POST /api/v1/scans - Start a new scan
router.post('/', async (req: ScanRequest, res: Response) => {
  try {
    console.log('Received scan request:', req.body);
    const { url } = ScanRequestSchema.parse(req.body);

    const zapUrl = process.env.ZAP_API_URL;
    if (!zapUrl) {
      throw new Error('ZAP_API_URL environment variable is not set');
    }
    
    // First, start spider scan
    console.log('Starting spider scan...');
    const spiderFormData = new URLSearchParams();
    spiderFormData.append('url', decodeURIComponent(url));
    spiderFormData.append('recurse', 'true');
    spiderFormData.append('maxChildren', '10');  // Limit depth for faster scanning
    spiderFormData.append('contextName', '');
    spiderFormData.append('subtreeOnly', 'false');

    const spiderResponse = await axios.post<{ scan: string }>('/zap/JSON/spider/action/scan/', spiderFormData, {
      baseURL: publicUrl,
      timeout: 30000,
      validateStatus: null,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('Spider scan response:', spiderResponse.data);

    // Wait for spider to complete
    await waitForSpiderToComplete(spiderResponse.data.scan);
    console.log('Spider scan completed');
    
    // Then start active scan
    console.log('Starting active scan...');
    const formData = new URLSearchParams();
    formData.append('url', decodeURIComponent(url));
    formData.append('recurse', 'true');
    formData.append('inScopeOnly', 'false');

    const response = await axios.post<ZapScanResponse>('/zap/JSON/ascan/action/scan/', formData, {
      baseURL: publicUrl,
      timeout: 30000,
      validateStatus: null,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('Active scan response:', response.data);
    
    // Create scan entry and store initial metadata
    const scanData = scanCache.createScan(url);

    // Update with spider scan ID and status
    scanCache.updateScan(scanData.uuid, {
      status: 'spider-scanning',
      spiderScanId: spiderResponse.data.scan
    });

    // Wait for spider to complete
    await waitForSpiderToComplete(spiderResponse.data.scan);
    console.log('Spider scan completed');
    
    // Update with active scan ID
    scanCache.updateScan(scanData.uuid, {
      status: 'active-scanning',
      activeScanId: response.data.scan,
      progress: 0
    });

    res.json({
      uuid: scanData.uuid,
      status: 'started',
      url,
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
    const scanMetadata = scanCache.getScanMetadata(uuid);
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
    const response = await axios.get<ZapStatusResponse>('/zap/JSON/ascan/view/status/', {
      baseURL: publicUrl,
      params: {
        scanId: scanMetadata.activeScanId
      },
      timeout: 30000,
      validateStatus: null
    });
    console.log('Active scan status response:', response.data);

    // Handle invalid or error responses from ZAP
    if (!response.data || response.data.status === undefined) {
      console.error('Invalid response from ZAP:', response.data);
      return res.json({
        uuid,
        status: null,
        isComplete: true,
        error: {
          message: 'Scan failed - Lost connection to ZAP service',
          code: 'ZAP_CONNECTION_ERROR',
          details: response.data
        }
      });
    }
    
    // Calculate progress
    const progress = Math.min(response.data.status, 100);
    const isComplete = progress >= 100;
    
    // Update cache with latest progress
    scanCache.updateScan(uuid, {
      progress,
      status: isComplete ? 'completed' : 'active-scanning'
    });

    let results = null;
    if (isComplete) {
      try {
        // Get alerts when complete
        const alertsResponse = await axios.get('/zap/JSON/core/view/alerts/', {
          baseURL: publicUrl,
          params: {
            start: 0,
            count: 100,
            riskId: ''  // Get all risk levels
          },
          timeout: 30000,
          validateStatus: null
        });

        if (!alertsResponse.data || !Array.isArray(alertsResponse.data.alerts)) {
          throw new Error('Invalid alerts response from ZAP');
        }

        results = alertsResponse.data.alerts;
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
