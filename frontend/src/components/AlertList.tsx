import { Stack, SegmentedControl, Group, Button } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import { AlertGroup } from './AlertGroup';
import { generateReport } from '../services/api';

interface Alert {
  id: string;
  name: string;
  risk: string;
  description: string;
  solution: string;
  reference: string;
  url: string;
  evidence?: string;
}

interface AlertListProps {
  alerts: Alert[];
  scanId: string;
}

export function AlertList({ alerts, scanId }: AlertListProps) {
  const [filter, setFilter] = useState('all');

  const groupedAlerts = useMemo(() => {
    const filtered = filter === 'all' 
      ? alerts 
      : alerts.filter(alert => alert.risk.toLowerCase() === filter.toLowerCase());

    return {
      High: filtered.filter(alert => alert.risk === 'High'),
      Medium: filtered.filter(alert => alert.risk === 'Medium'),
      Low: filtered.filter(alert => alert.risk === 'Low'),
      Informational: filtered.filter(alert => alert.risk === 'Informational')
    };
  }, [alerts, filter]);

  const riskColors = {
    High: 'red',
    Medium: 'orange',
    Low: 'yellow',
    Informational: 'blue'
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Button
          leftSection={<IconDownload size={14} />}
          onClick={() => generateReport(scanId)}
          variant="light"
        >
          Download PDF Report
        </Button>
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          data={[
            { label: 'All', value: 'all' },
            { label: 'High', value: 'high' },
            { label: 'Medium', value: 'medium' },
            { label: 'Low', value: 'low' },
            { label: 'Info', value: 'informational' }
          ]}
        />
      </Group>

      {Object.entries(groupedAlerts).map(([risk, alerts]) => (
        <AlertGroup
          key={risk}
          title={`${risk} Risk Alerts`}
          alerts={alerts}
          color={riskColors[risk as keyof typeof riskColors]}
        />
      ))}
    </Stack>
  );
}
