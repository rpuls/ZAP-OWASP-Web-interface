import { useState, useEffect, useRef } from 'react';
import { TextInput, Button, Paper, Progress, Text, Stack, rem, Divider, Select, Group } from '@mantine/core';
import { AlertList } from './AlertList';
import { useQuery, useMutation } from '@tanstack/react-query';
import { startScan, getScanStatus, getScanAlerts, getActiveScans, ScanStatus } from '../services/api';

// Helper function to get status text based on scan status
const getScanStatusText = (status: string, progress: number): string => {
  switch (status) {
    case 'pinging-target':
      return 'Checking if target website is reachable...';
    case 'spider-scanning':
      return 'Spider scan in progress...';
    case 'active-scanning':
      return `Active scan progress: ${progress}%`;
    case 'completed':
      return 'Scan completed';
    case 'failed':
      return 'Scan failed';
    default:
      return `Scan progress: ${progress}%`;
  }
};

// Helper function to strip protocol from URL
const stripProtocol = (url: string): string => {
  return url.replace(/^https?:\/\//, '');
};

// Helper function to extract protocol from URL
const extractProtocol = (url: string): 'https://' | 'http://' => {
  if (url.startsWith('http://')) {
    return 'http://';
  }
  return 'https://'; // default to https
};

export function ScanForm() {
  const [url, setUrl] = useState(() => {
    const savedUrl = localStorage.getItem('lastScanUrl') || '';
    return stripProtocol(savedUrl);
  });
  const [protocol, setProtocol] = useState<'https://' | 'http://'>(() => {
    const savedUrl = localStorage.getItem('lastScanUrl') || '';
    return extractProtocol(savedUrl);
  });
  const [uuid, setUuid] = useState<string | null>(null);
  const [activeScans, setActiveScans] = useState<ScanStatus[]>([]);
  const defaultSetRef = useRef(false);
  const [hasActiveScan, setHasActiveScan] = useState(false);

  // Fetch active scans on component mount
  useEffect(() => {
    const fetchActiveScans = async () => {
      if (!defaultSetRef.current) {
        try {
          const scans = await getActiveScans();
          if (scans && scans.length > 0) {
            setActiveScans(scans);
            setHasActiveScan(true);
            
            setUuid(scans[0].uuid);
            const fullUrl = scans[0].url;
            setProtocol(extractProtocol(fullUrl));
            setUrl(stripProtocol(fullUrl));
            // Mark that we've set the default
            defaultSetRef.current = true;
          }
        } catch (error) {
          console.error('Failed to fetch active scans:', error);
          defaultSetRef.current = true; // Mark as set even on error to prevent retries
        }
      }
    };
    
    fetchActiveScans();
  }, []);

  const { mutate: startScanMutation, isPending: isStarting } = useMutation({
    mutationFn: startScan,
    onSuccess: (data) => {
      console.log('Scan started successfully:', data);
      setIsComplete(false); // Reset completion state for new scan
      setUuid(data.uuid);
      localStorage.setItem('lastScanUrl', protocol + url); // Save full URL to localStorage
      setHasActiveScan(true);
      
      // Add the new scan to active scans
      const updateActiveScans = async () => {
        try {
          const scans = await getActiveScans();
          setActiveScans(scans);
        } catch (error) {
          console.error('Failed to update active scans:', error);
        }
      };
      
      updateActiveScans();
    },
    onError: (error) => {
      console.error('Failed to start scan:', error);
      // Show error with memory guidance in UI
      setError(
        "Failed to start scan. This commonly occurs when the ZAP service runs out of memory. " +
        "Please ensure your ZAP container has at least 2GB of RAM available."
      );
    },
  });

  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const TIMEOUT_THRESHOLD = 60 * 1000;

  const { data: scanStatus, dataUpdatedAt } = useQuery({
    queryKey: ['scanStatus', uuid],
    queryFn: () => getScanStatus(uuid!),
    enabled: !!uuid && !isComplete,
    refetchInterval: (query) => 
      query.state.data?.error || query.state.data?.status === 'completed' ? false : 1000
  });

  // Fetch alerts only when scan is completed
  const { data: alerts } = useQuery({
    queryKey: ['scanAlerts', uuid],
    queryFn: () => getScanAlerts(uuid!),
    enabled: !!uuid && scanStatus?.status === 'completed',
  });

  // Update completion state when scan is complete
  useEffect(() => {
    if (scanStatus?.status === 'completed' && !isComplete) {
      setIsComplete(true);
      
      // Refresh active scans list when a scan completes
      const refreshActiveScans = async () => {
        try {
          const scans = await getActiveScans();
          setActiveScans(scans);
          setHasActiveScan(scans.length > 0);
        } catch (error) {
          console.error('Failed to refresh active scans:', error);
        }
      };
      
      refreshActiveScans();
    }
  }, [scanStatus?.status, isComplete]);

  // Handle error states from scan status
  useEffect(() => {
    if (scanStatus?.error) {
      console.log(scanStatus);
      setHasActiveScan(false);
    }
  }, [scanStatus?.error]);

  const isStalled = dataUpdatedAt && (Date.now() - dataUpdatedAt > TIMEOUT_THRESHOLD) && scanStatus?.status !== 'completed';

  // Handle scan selection change
  const handleScanChange = (value: string | null) => {
    if (value) {
      const selectedScan = activeScans.find(scan => scan.uuid === value);
      if (selectedScan) {
        setUuid(value);
        const fullUrl = selectedScan.url;
        setProtocol(extractProtocol(fullUrl));
        setUrl(stripProtocol(fullUrl));
        setIsComplete(false); // Reset completion state for new selection
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear any previous errors
    if (url) {
      // Strip any protocol that might have been entered and combine with selected protocol
      const cleanUrl = stripProtocol(url);
      const fullUrl = protocol + cleanUrl;
      startScanMutation(fullUrl);
    }
  };

  return (
    <Paper p="md" withBorder>
      <form onSubmit={handleSubmit}>
        <Stack gap={rem(16)}>
          {activeScans.length > 1 ? (
            <Select
              label="Active Scans"
              description="Select an active scan to view its progress"
              data={activeScans.map(scan => ({
                value: scan.uuid,
                label: scan.url
              }))}
              value={uuid}
              onChange={handleScanChange}
            />
          ) : (
            <div>
              <Text size="sm" fw={500} mb={rem(4)}>
                URL to Scan
              </Text>
              <Text size="xs" c="dimmed" mb={rem(8)}>
                {hasActiveScan ? "Currently scanning this URL" : "Enter the URL you want to scan for vulnerabilities"}
              </Text>
              <Group gap="xs" align="flex-start">
                <Select
                  data={[
                    { value: 'https://', label: 'https://' },
                    { value: 'http://', label: 'http://' }
                  ]}
                  value={protocol}
                  onChange={(value) => setProtocol(value as 'https://' | 'http://')}
                  disabled={hasActiveScan || isStarting}
                  style={{ width: '110px' }}
                  allowDeselect={false}
                />
                <TextInput
                  required
                  placeholder="example.com"
                  value={url}
                  onChange={(e) => {
                    // Strip protocol if user pastes a full URL
                    const inputValue = e.target.value;
                    setUrl(stripProtocol(inputValue));
                  }}
                  disabled={hasActiveScan || isStarting}
                  style={{ flex: 1 }}
                />
              </Group>
            </div>
          )}
          
          <Button
            type="submit"
            loading={isStarting}
            disabled={!url || isStarting || hasActiveScan}
          >
            {isStarting ? 'Starting Scan...' : 'Start Scan'}
          </Button>

          {error && (
            <Text color="red" fw={500}>
              {error}
            </Text>
          )}

          {scanStatus && (
            <>
              {scanStatus.error || isStalled ? (
                <>
                  <Text color="red" fw={500}>
                    {scanStatus.error ? scanStatus.error : 
                      "The scan is taking longer than usual."}
                  </Text>
                  <Text size="sm" c="dimmed">
                    This typically happens when the ZAP service runs out of memory. Please check the server logs of your ZAP instance. 
                  </Text>
                </>
              ) : (
                <>
                  <Text size="sm" fw={500}>
                    {getScanStatusText(scanStatus.status, scanStatus.progress)}
                  </Text>
                  <Progress 
                    value={scanStatus.progress} 
                    size="xl" 
                    radius="xl" 
                    striped 
                    animated={scanStatus.status !== 'completed'}
                    color={scanStatus.status === 'failed' ? 'red' : undefined}
                  />
                  {scanStatus.status === 'completed' && !scanStatus.error && (
                    <>
                      <Text color="green" fw={500}>
                        Scan Complete!
                      </Text>
                      {alerts && alerts.length > 0 && uuid && (
                        <>
                          <Divider my="lg" />
                          <AlertList alerts={alerts} uuid={uuid} />
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          <Text size="xs" c="dimmed" ta="center">
            Please make sure your ZAP service has {'>'}2GB of RAM
          </Text>
        </Stack>
      </form>
    </Paper>
  );
}
