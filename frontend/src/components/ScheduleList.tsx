import { useState } from 'react';
import { 
  Stack, 
  Button, 
  Group, 
  Text, 
  SimpleGrid, 
  Paper, 
  Modal,
  Alert,
  Space
} from '@mantine/core';
import { IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getSchedules, 
  createSchedule, 
  updateSchedule, 
  deleteSchedule,
  Schedule,
  ScheduleCreateInput,
  ScheduleUpdateInput
} from '../services/api';
import { ScheduleCard } from './ScheduleCard';
import { ScheduleForm } from './ScheduleForm';
import { ScheduleRunnerStatus } from './ScheduleRunnerStatus';

export function ScheduleList() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  // Fetch schedules
  const { 
    data, 
    isLoading: isLoadingSchedules, 
    error: schedulesError 
  } = useQuery({
    queryKey: ['schedules'],
    queryFn: getSchedules
  });

  // Create schedule mutation
  const { 
    mutate: createScheduleMutation, 
    isPending: isCreating 
  } = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsFormOpen(false);
      setSelectedSchedule(undefined);
      setFormError(undefined);
    },
    onError: (error: any) => {
      console.error('Failed to create schedule:', error);
      setFormError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to create schedule'
      );
    }
  });

  // Update schedule mutation
  const { 
    mutate: updateScheduleMutation, 
    isPending: isUpdating 
  } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScheduleUpdateInput }) => 
      updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsFormOpen(false);
      setSelectedSchedule(undefined);
      setFormError(undefined);
    },
    onError: (error: any) => {
      console.error('Failed to update schedule:', error);
      setFormError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to update schedule'
      );
    }
  });

  // Delete schedule mutation
  const { 
    mutate: deleteScheduleMutation
  } = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error: any) => {
      console.error('Failed to delete schedule:', error);
    }
  });

  // Toggle schedule active state
  const { 
    mutate: toggleActiveMutation
  } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      updateSchedule(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error: any) => {
      console.error('Failed to toggle schedule active state:', error);
    }
  });

  // Handle form submission
  const handleFormSubmit = (formData: ScheduleCreateInput | ScheduleUpdateInput) => {
    if (selectedSchedule) {
      updateScheduleMutation({ id: selectedSchedule.id, data: formData });
    } else {
      createScheduleMutation(formData as ScheduleCreateInput);
    }
  };

  // Handle edit button click
  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsFormOpen(true);
    setFormError(undefined);
  };

  // Handle delete button click
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      deleteScheduleMutation(id);
    }
  };

  // Handle toggle active state
  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation({ id, isActive });
  };

  // Handle add new schedule button click
  const handleAddNew = () => {
    setSelectedSchedule(undefined);
    setIsFormOpen(true);
    setFormError(undefined);
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedSchedule(undefined);
    setFormError(undefined);
  };

  // Render loading state
  if (isLoadingSchedules) {
    return (
      <Paper p="xl" withBorder>
        <Text>Loading schedules...</Text>
      </Paper>
    );
  }

  // Render error state
  if (schedulesError) {
    return (
      <Paper p="xl" withBorder>
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Error loading schedules" 
          color="red"
        >
          {schedulesError instanceof Error 
            ? schedulesError.message 
            : 'Failed to load schedules'}
        </Alert>
      </Paper>
    );
  }

  const schedules = data?.schedules || [];

  return (
    <>
      <Stack gap="md">
        <ScheduleRunnerStatus />
        
        <Space h="md" />
        <Group justify="space-between">
          <Text size="xl" fw={500}>Scheduled Scans</Text>
          <Button 
            leftSection={<IconPlus size={16} />}
            onClick={handleAddNew}
          >
            Add New Schedule
          </Button>
        </Group>

        {schedules.length === 0 ? (
          <Paper p="xl" withBorder>
            <Text ta="center">No scheduled scans yet. Click "Add New Schedule" to create one.</Text>
          </Paper>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {schedules.map(schedule => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <Modal
        opened={isFormOpen}
        onClose={handleFormCancel}
        title={selectedSchedule ? 'Edit Schedule' : 'New Schedule'}
        size="lg"
      >
        <ScheduleForm
          schedule={selectedSchedule}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isSubmitting={isCreating || isUpdating}
          error={formError}
        />
      </Modal>
    </>
  );
}
