import { useState } from 'react';
import { Paper, Text, Group, Button, Badge, Divider, Stack } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchedules } from '../services/api';

interface RunnerStatus {
  isRunning: boolean;
  checkIntervalMs: number;
}

export function ScheduleRunnerStatus() {
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch runner status
  const { 
    data: status, 
    isLoading: isLoadingStatus, 
    error: statusError 
  } = useQuery<RunnerStatus>({
    queryKey: ['scheduleRunnerStatus'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/schedules/runner/status');
      return response.data;
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });
  
  // Fetch schedules to check if there are any
  const {
    data: schedulesData,
    isLoading: isLoadingSchedules
  } = useQuery({
    queryKey: ['schedules'],
    queryFn: getSchedules
  });

  // Mutation to trigger a check for due schedules
  const { mutate: triggerCheck, isPending: isTriggering } = useMutation({
    mutationFn: async () => {
      setTriggerError(null);
      const response = await axios.post('/api/v1/schedules/runner/check');
      return response.data;
    },
    onSuccess: () => {
      // Refetch the status after triggering a check
      queryClient.invalidateQueries({ queryKey: ['scheduleRunnerStatus'] });
      // Also refetch schedules to show any updates
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error: any) => {
      console.error('Failed to trigger check:', error);
      setTriggerError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to trigger check for due schedules'
      );
    }
  });

  if (isLoadingStatus || isLoadingSchedules) {
    return (
      <Paper p="md" withBorder>
        <Text>Loading runner status...</Text>
      </Paper>
    );
  }

  if (statusError) {
    return (
      <Paper p="md" withBorder>
        <Text color="red">Error loading runner status</Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={500}>Schedule Runner Status</Text>
          <Badge 
            color={status?.isRunning && (schedulesData?.schedules?.length || 0) > 0 ? 'green' : 'gray'} 
            variant="light"
          >
            {status?.isRunning && (schedulesData?.schedules?.length || 0) > 0 
              ? 'Running' 
              : (schedulesData?.schedules?.length || 0) === 0 
                ? 'Idle (No Schedules)' 
                : 'Stopped'}
          </Badge>
        </Group>
        
        <Text size="sm">
          Check interval: {status?.checkIntervalMs ? `${status.checkIntervalMs / 1000} seconds` : 'N/A'}
        </Text>
        
        {(schedulesData?.schedules?.length || 0) > 0 && (
          <>
            <Divider />
            
            <Group justify="space-between">
              <Text size="sm">Manually trigger a check for due schedules:</Text>
              <Button 
                leftSection={<IconRefresh size={16} />}
                size="xs"
                onClick={() => triggerCheck()}
                loading={isTriggering}
              >
                Run Check Now
              </Button>
            </Group>
          </>
        )}
        
        {triggerError && (
          <Text size="sm" color="red">
            {triggerError}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
