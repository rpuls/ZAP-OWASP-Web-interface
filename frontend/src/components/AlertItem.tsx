import { Paper, Text, Accordion, Stack } from '@mantine/core';

interface AlertItemProps {
  alert: {
    id: string;
    name: string;
    risk: string;
    description: string;
    solution: string;
    reference: string;
    url: string;
    evidence?: string;
  };
}

export function AlertItem({ alert }: AlertItemProps) {
  return (
    <Accordion.Item value={alert.id}>
      <Accordion.Control>
        <Text fw={500}>{alert.name}</Text>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="md">
          <Paper withBorder p="sm">
            <Text size="sm" fw={500} mb={5}>Description</Text>
            <Text size="sm">{alert.description}</Text>
          </Paper>

          <Paper withBorder p="sm">
            <Text size="sm" fw={500} mb={5}>Solution</Text>
            <Text size="sm">{alert.solution}</Text>
          </Paper>

          {alert.evidence && (
            <Paper withBorder p="sm">
              <Text size="sm" fw={500} mb={5}>Evidence</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{alert.evidence}</Text>
            </Paper>
          )}

          <Paper withBorder p="sm">
            <Text size="sm" fw={500} mb={5}>URL</Text>
            <Text size="sm" component="a" href={alert.url} target="_blank" rel="noopener noreferrer">
              {alert.url}
            </Text>
          </Paper>

          {alert.reference && (
            <Paper withBorder p="sm">
              <Text size="sm" fw={500} mb={5}>References</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {alert.reference.split('\n').map((ref, i) => (
                  <Text 
                    key={i} 
                    component="a" 
                    href={ref} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    display="block"
                  >
                    {ref}
                  </Text>
                ))}
              </Text>
            </Paper>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
