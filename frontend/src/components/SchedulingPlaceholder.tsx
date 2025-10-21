import { Paper, Text, Stack, ThemeIcon, rem } from '@mantine/core';
import { IconCalendarTime } from '@tabler/icons-react';

export function SchedulingPlaceholder() {
  return (
    <Paper p="xl" withBorder>
      <Stack align="center" gap={rem(16)}>
        <ThemeIcon size={60} radius={30} color="gray.3">
          <IconCalendarTime size={30} color="gray" />
        </ThemeIcon>
        <Text fw={500} size="lg" ta="center">Scan Scheduling</Text>
        <Text c="dimmed" ta="center" maw={500}>
          This feature is coming soon. You'll be able to schedule regular security scans
          for your websites and receive notifications about new vulnerabilities.
        </Text>
      </Stack>
    </Paper>
  );
}
