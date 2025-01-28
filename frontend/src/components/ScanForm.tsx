import { useState, useEffect } from 'react';
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
    },
  });

  const [isComplete, setIsComplete] = useState(false);

  const { data: scanStatus } = useQuery({
    queryKey: ['scanStatus', uuid],
    queryFn: () => getScanStatus(uuid!),
    enabled: !!uuid && !isComplete,
    refetchInterval: (query) => 
      query.state.data?.error || query.state.data?.isComplete ? false : 1000
  });

  // Update completion state when scan is complete
  useEffect(() => {
    if (scanStatus?.isComplete && !isComplete) {
      setIsComplete(true);
    }
  }, [scanStatus?.isComplete, isComplete]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

          {scanStatus && (
            <>
              {scanStatus.error ? (
                <Text color="red" fw={500}>
                  {scanStatus.error.message}
                </Text>
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
        </Stack>
      </form>
    </Paper>
  );
}
