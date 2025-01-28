import { useState, useEffect, useMemo } from 'react';
import { TextInput, Button, Paper, Progress, Text, Stack, rem, Divider } from '@mantine/core';
import { AlertList } from './AlertList';
import { useQuery, useMutation } from '@tanstack/react-query';
import { startScan, getScanStatus } from '../services/api';

export function ScanForm() {
  const [url, setUrl] = useState(() => localStorage.getItem('lastScanUrl') || '');
  const [uuid, setUuid] = useState<string | null>(null);

  const { mutate: startScanMutation, isPending: isStarting } = useMutation({
    mutationFn: startScan,
    onSuccess: (data) => {
      console.log('Scan started successfully:', data);
      setIsComplete(false); // Reset completion state for new scan
      setUuid(data.uuid);
      localStorage.setItem('lastScanUrl', url); // Save URL to localStorage
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
  const [lastProgress, setLastProgress] = useState<number | null>(null);
  const [lastProgressTime, setLastProgressTime] = useState<number | null>(null);
  const TIMEOUT_THRESHOLD = 30000; // 30 seconds

  const { data: scanStatus } = useQuery({
    queryKey: ['scanStatus', uuid],
    queryFn: () => getScanStatus(uuid!),
    enabled: !!uuid && !isComplete,
    refetchInterval: (query) => 
      query.state.data?.error || query.state.data?.isComplete ? false : 1000
  });

  // Track progress updates and completion state
  useEffect(() => {
    if (!scanStatus) return;

    if (scanStatus.isComplete && !isComplete) {
      setIsComplete(true);
      return;
    }

    // Update progress tracking
    if (scanStatus.status !== lastProgress) {
      setLastProgress(scanStatus.status);
      setLastProgressTime(Date.now());
    }
  }, [scanStatus, lastProgress, isComplete]);

  // Check if progress is stalled
  const isProgressStalled = useMemo(() => {
    if (!lastProgressTime || !scanStatus || scanStatus.isComplete || scanStatus.error) return false;
    return Date.now() - lastProgressTime > TIMEOUT_THRESHOLD;
  }, [lastProgressTime, scanStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear any previous errors
    if (url) {
      startScanMutation(url);
    }
  };

  return (
    <Paper p="md" withBorder>
      <form onSubmit={handleSubmit}>
        <Stack gap={rem(16)}>
          <TextInput
            required
            label="URL to Scan"
            description="Enter the URL you want to scan for vulnerabilities"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
            }}
            disabled={isStarting}
          />
          
          <Button
            type="submit"
            loading={isStarting}
            disabled={!url || isStarting}
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
              {scanStatus.error || isProgressStalled ? (
                <>
                  <Text color="red" fw={500}>
                    {scanStatus.error ? scanStatus.error.message : 
                      "The scan is taking longer than usual."}
                  </Text>
                  <Text size="sm" c="dimmed">
                    This typically happens when the ZAP service runs out of memory. Please check the server logs of your ZAP instance. 
                    At least 2GB of RAM is required to crawl and scan larger sites.
                  </Text>
                </>
              ) : (
                <>
                  <Text size="sm" fw={500}>
                    {scanStatus.status === 0 ? 'Spider scan in progress...' : `Active scan progress: ${scanStatus.status}%`}
                  </Text>
                  <Progress 
                    value={scanStatus.status ?? 0} 
                    size="xl" 
                    radius="xl" 
                    striped 
                    animated={!scanStatus.isComplete}
                    color={scanStatus.status === null ? 'red' : undefined}
                  />
                  {scanStatus.isComplete && !scanStatus.error && (
                    <>
                      <Text color="green" fw={500}>
                        Scan Complete!
                      </Text>
                      {scanStatus.results && uuid && (
                        <>
                          <Divider my="lg" />
                          <AlertList alerts={scanStatus.results} uuid={uuid} />
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
