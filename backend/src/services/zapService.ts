import axios from 'axios';
import { ZapScanResponse, ZapStatusResponse, ZapAlert } from '../types';

/**
 * Service for interacting with the ZAP API
 */
class ZapService {
  private baseUrl: string = '';
  private initialized = false;
  
  /**
   * Initialize the service with environment variables
   * This is called lazily when the service is first used
   */
  private initialize(): void {
    if (this.initialized) return;
    
    // Check if ZAP_API_URL is set
    const zapUrl = process.env.ZAP_API_URL;
    if (!zapUrl) {
      console.error('ZAP_API_URL environment variable is not set');
      // We'll throw an error when methods are called
    }
    
    // Get public URL from environment
    this.baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.PUBLIC_URL || 'http://localhost:3001';
      
    this.initialized = true;
  }
  
  /**
   * Validate that ZAP API URL is configured
   * @private
   */
  private validateZapApiUrl(): void {
    this.initialize();
    const zapUrl = process.env.ZAP_API_URL;
    if (!zapUrl) {
      throw new Error('ZAP_API_URL environment variable is not set');
    }
  }

  /**
   * Start a spider scan
   * @param url The URL to scan
   * @returns The spider scan ID
   */
  async startSpiderScan(url: string): Promise<string> {
    this.validateZapApiUrl();
    console.log('Starting spider scan...');
    const spiderFormData = new URLSearchParams();
    spiderFormData.append('url', decodeURIComponent(url));
    spiderFormData.append('recurse', 'true');
    spiderFormData.append('maxChildren', '10');  // Limit depth for faster scanning
    spiderFormData.append('contextName', '');
    spiderFormData.append('subtreeOnly', 'false');

    const response = await axios.post<{ scan: string }>('/zap/JSON/spider/action/scan/', spiderFormData, {
      baseURL: this.baseUrl,
      timeout: 30000,
      validateStatus: null,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Spider scan response:', response.data);
    
    if (!response.data || !response.data.scan) {
      throw new Error('Invalid response from ZAP spider scan');
    }
    
    return response.data.scan;
  }

  /**
   * Check the status of a spider scan
   * @param spiderId The spider scan ID
   * @returns The status (0-100)
   */
  async checkSpiderStatus(spiderId: string): Promise<number> {
    this.validateZapApiUrl();
    const response = await axios.get<{ status: number }>('/zap/JSON/spider/view/status/', {
      baseURL: this.baseUrl,
      params: { scanId: spiderId },
      timeout: 30000,
      validateStatus: null
    });

    if (!response.data || response.data.status === undefined) {
      throw new Error('Invalid response from ZAP spider status check');
    }

    return response.data.status;
  }

  /**
   * Wait for a spider scan to complete
   * @param spiderId The spider scan ID
   */
  async waitForSpiderToComplete(spiderId: string): Promise<void> {
    this.validateZapApiUrl();
    while (true) {
      const status = await this.checkSpiderStatus(spiderId);
      
      if (status >= 100) {
        break;
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('Spider scan completed');
  }

  /**
   * Start an active scan
   * @param url The URL to scan
   * @returns The active scan ID
   */
  async startActiveScan(url: string): Promise<string> {
    this.validateZapApiUrl();
    console.log('Starting active scan...');
    const formData = new URLSearchParams();
    formData.append('url', decodeURIComponent(url));
    formData.append('recurse', 'true');
    formData.append('inScopeOnly', 'false');

    const response = await axios.post<ZapScanResponse>('/zap/JSON/ascan/action/scan/', formData, {
      baseURL: this.baseUrl,
      timeout: 30000,
      validateStatus: null,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Active scan response:', response.data);
    
    if (!response.data || !response.data.scan) {
      throw new Error('Invalid response from ZAP active scan');
    }
    
    return response.data.scan;
  }

  /**
   * Check the status of an active scan
   * @param scanId The active scan ID
   * @returns The status response containing progress information
   */
  async checkActiveScanStatus(scanId: string): Promise<ZapStatusResponse> {
    this.validateZapApiUrl();
    const response = await axios.get<ZapStatusResponse>('/zap/JSON/ascan/view/status/', {
      baseURL: this.baseUrl,
      params: { scanId },
      timeout: 30000,
      validateStatus: null
    });

    if (!response.data || response.data.status === undefined) {
      throw new Error('Invalid response from ZAP active scan status check');
    }

    return response.data;
  }

  /**
   * Get alerts from a completed scan
   * @param scanId Optional scan ID to filter alerts
   * @param start The start index (default 0)
   * @param count The number of alerts to fetch (default 100)
   * @param riskId The risk ID filter (default empty for all risks)
   * @returns Array of alerts
   */
  async getAlerts(scanId?: string, start: number = 0, count: number = 100, riskId: string = ''): Promise<ZapAlert[]> {
    this.validateZapApiUrl();
    const params: Record<string, any> = {
      start,
      count,
      riskId
    };
    
    // Add scanId to params if provided
    if (scanId) {
      params.scanId = scanId;
    }
    
    const response = await axios.get('/zap/JSON/core/view/alerts/', {
      baseURL: this.baseUrl,
      params,
      timeout: 30000,
      validateStatus: null
    });

    if (!response.data || !Array.isArray(response.data.alerts)) {
      throw new Error('Invalid alerts response from ZAP');
    }

    return response.data.alerts;
  }

  /**
   * Get direct ZAP API URL for use in other services
   */
  getZapApiUrl(): string {
    this.validateZapApiUrl();
    return `http://${process.env.ZAP_API_URL}:8080`;
  }
}

// Export singleton instance using lazy initialization
// This ensures the constructor isn't called until the service is actually used
class ZapServiceSingleton {
  private static instance: ZapService | null = null;
  
  static getInstance(): ZapService {
    if (!this.instance) {
      this.instance = new ZapService();
    }
    return this.instance;
  }
}

export const zapService = ZapServiceSingleton.getInstance();
