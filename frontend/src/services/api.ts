import axios from 'axios';

// Use same domain as frontend in production
const API_URL = '/api/v1';

export interface ScanResponse {
  uuid: string;
  status: string;
  url: string;
}

export interface ScanStatus {
  uuid: string;
  status: number | null;
  isComplete: boolean;
  results: any[] | null;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export async function startScan(url: string): Promise<ScanResponse> {
  const response = await axios.post(`${API_URL}/scans`, { url });
  return response.data;
}

export async function getScanStatus(uuid: string): Promise<ScanStatus> {
  const response = await axios.get(`${API_URL}/scans/${uuid}`);
  return response.data;
}

export async function generateReport(uuid: string): Promise<void> {
  const response = await axios.post(
    `${API_URL}/reports/generate`,
    { uuid },
    { responseType: 'blob' }
  );
  
  // Get filename from Content-Disposition header
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'security-report.pdf'; // fallback
  
  if (contentDisposition) {
    // Parse filename from Content-Disposition
    const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([\w%.-]+)/);
    if (filenameMatch) {
      filename = decodeURIComponent(filenameMatch[1]);
    }
  }

  // Create blob URL and trigger download
  const blob = response.data;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
