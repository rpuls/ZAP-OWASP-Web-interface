import { Request } from 'express';

export interface ScanRequest extends Request {
  body: {
    url: string;
  };
}

export interface ZapScanResponse {
  scan: string;
  status: string;
}

export interface ZapStatusResponse {
  status: number;
  progress: number;
}

export interface ZapAlert {
  id: string;
  name: string;
  risk: string;
  description: string;
  solution: string;
  reference: string;
  url: string;
  evidence?: string;
  param?: string;
  attack?: string;
  other?: string;
  confidence?: string;
  wascid?: string;
  cweid?: string;
  tags?: Record<string, string>;
}

export interface ScanStatus {
  scanId: string;
  status: number;
  isComplete: boolean;
  results: ZapAlert[] | null;
}
