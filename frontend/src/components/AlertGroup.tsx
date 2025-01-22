import { Paper, Text, Accordion } from '@mantine/core';
import { AlertItem } from './AlertItem';

interface AlertGroupProps {
  title: string;
  alerts: any[];
  color: string;
}

export function AlertGroup({ title, alerts, color }: AlertGroupProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <Paper withBorder p="md" radius="md">
      <Text 
        fw={700} 
        mb="md" 
        size="lg"
        c={color}
      >
        {title} ({alerts.length})
      </Text>
      <Accordion>
        {alerts.map(alert => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </Accordion>
    </Paper>
  );
}
