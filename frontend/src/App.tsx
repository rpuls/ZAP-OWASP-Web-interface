import { useState, useEffect } from 'react';
import { MantineProvider, createTheme, Group, Stack, Text, Anchor, Tabs, rem } from '@mantine/core';
import { ScanForm } from './components/ScanForm';
import { ScanHistoryTable } from './components/ScanHistoryTable';
import { SchedulingPlaceholder } from './components/SchedulingPlaceholder';
import { useQuery } from '@tanstack/react-query';
import { getScanHistory } from './services/api';
import '@mantine/core/styles.css';
import zapLogo from './assets/ZAP-logo.png';
import funkytonLogo from './assets/funkyton-logo.png';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'system-ui, -apple-system, sans-serif',
});

function App() {
  const [activeTab, setActiveTab] = useState<string | null>('scan-now');
  const [hasScans, setHasScans] = useState(false);
  const [currentScanUuid, setCurrentScanUuid] = useState<string | null>(null);
  
  // Check if there are any scans to enable/disable the Scan History tab
  const { data: scanHistoryData } = useQuery({
    queryKey: ['scanHistoryCheck'],
    queryFn: () => getScanHistory(1, 1),
    refetchInterval: 5000, // Check every 5 seconds
  });
  
  // Update hasScans state when data changes
  useEffect(() => {
    if (scanHistoryData && scanHistoryData.scans.length > 0) {
      setHasScans(true);
    }
  }, [scanHistoryData]);
  
  // Handle tab change
  const handleTabChange = (value: string | null) => {
    setActiveTab(value);
  };
  
  return (
    <MantineProvider theme={theme}>
      <div style={{
        maxWidth: '800px',
        margin: '2rem auto',
        padding: '0 1rem',
      }}>
        <Group justify="center" align="center" mb="2rem">
          <img src={zapLogo} alt="ZAP Logo" style={{ height: '40px' }} />
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 600,
            margin: 0
          }}>
            ZAP OWASP Scanner
          </h1>
        </Group>
        
        <Tabs value={activeTab} onChange={handleTabChange} mb={rem(16)}>
          <Tabs.List>
            <Tabs.Tab value="scan-now">Scan Now</Tabs.Tab>
            <Tabs.Tab value="scan-history" disabled={!hasScans}>Scan History</Tabs.Tab>
            <Tabs.Tab value="scheduling" disabled>Scheduling</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="scan-now" pt={rem(16)}>
            <ScanForm 
              currentUuid={currentScanUuid} 
              onScanStart={(uuid) => setCurrentScanUuid(uuid)} 
            />
          </Tabs.Panel>
          
          <Tabs.Panel value="scan-history" pt={rem(16)}>
            <ScanHistoryTable />
          </Tabs.Panel>
          
          <Tabs.Panel value="scheduling" pt={rem(16)}>
            <SchedulingPlaceholder />
          </Tabs.Panel>
        </Tabs>
        
        {/* <Stack align="center" style={{ marginTop: '3rem' }}>
          <Group gap="xs">
            <Anchor href="https://funkyton.com/" target="_blank">Blog</Anchor>
            <Text>•</Text>
            <Anchor href="https://funkyton.com/zap-owasp-web-scan/" target="_blank">Read more about this scanner</Anchor>
            <Text>•</Text>
            <Anchor href="https://www.zaproxy.org/" target="_blank">Powered by ZAP</Anchor>
          </Group>
          <Anchor href="https://funkyton.com/" target="_blank">
            <Group gap="xs" align="center">
              <Text size="sm">Made by</Text>
              <img src={funkytonLogo} alt="Funkyton Logo" style={{ height: '30px' }} />
            </Group>
          </Anchor>
        </Stack> */}
      </div>
    </MantineProvider>
  );
}

export default App;
