import { useState, useEffect } from 'react';
import { 
  TextInput, 
  Button, 
  Group, 
  Stack, 
  Select, 
  MultiSelect, 
  Checkbox,
  Paper,
  Title,
  Text,
  Divider
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { Schedule, ScheduleCreateInput, ScheduleUpdateInput } from '../services/api';

interface ScheduleFormProps {
  schedule?: Schedule;
  onSubmit: (data: ScheduleCreateInput | ScheduleUpdateInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
}

export function ScheduleForm({ 
  schedule, 
  onSubmit, 
  onCancel, 
  isSubmitting,
  error
}: ScheduleFormProps) {
  const [url, setUrl] = useState(schedule?.url || '');
  const [name, setName] = useState(schedule?.name || '');
  const [startTime, setStartTime] = useState<Date>(schedule?.startTime || new Date());
  const [repeatPattern, setRepeatPattern] = useState<string>(schedule?.repeatPattern || 'none');
  const [repeatDays, setRepeatDays] = useState<string[]>(
    schedule?.repeatDays?.map(d => d.toString()) || []
  );
  const [isActive, setIsActive] = useState(schedule?.isActive !== false);

  // Generate day options based on repeat pattern
  const getDayOptions = () => {
    if (repeatPattern === 'weekly') {
      return [
        { value: '0', label: 'Sunday' },
        { value: '1', label: 'Monday' },
        { value: '2', label: 'Tuesday' },
        { value: '3', label: 'Wednesday' },
        { value: '4', label: 'Thursday' },
        { value: '5', label: 'Friday' },
        { value: '6', label: 'Saturday' }
      ];
    } else if (repeatPattern === 'monthly') {
      return Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        const suffix = ['st', 'nd', 'rd'][((day + 90) % 100 - 10) % 10 - 1] || 'th';
        return { value: day.toString(), label: `${day}${suffix}` };
      });
    }
    return [];
  };

  // Reset repeat days when pattern changes
  useEffect(() => {
    if (repeatPattern === 'none' || repeatPattern === 'daily') {
      setRepeatDays([]);
    }
  }, [repeatPattern]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: ScheduleCreateInput | ScheduleUpdateInput = {
      url,
      name: name || undefined,
      startTime,
      repeatPattern: repeatPattern === 'none' ? undefined : repeatPattern,
      repeatDays: repeatDays.length > 0 ? repeatDays.map(d => parseInt(d, 10)) : undefined,
      isActive
    };
    
    onSubmit(formData);
  };

  return (
    <Paper p="md" withBorder>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Title order={3}>{schedule ? 'Edit Schedule' : 'New Schedule'}</Title>
          
          <TextInput
            required
            label="URL to Scan"
            description="Enter the URL you want to scan for vulnerabilities"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isSubmitting}
          />
          
          <TextInput
            label="Name (Optional)"
            description="Give this schedule a descriptive name"
            placeholder="Weekly Production Scan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
          
          <DateTimePicker
            required
            label="Start Time"
            description="When should the first scan start"
            value={startTime}
            onChange={(date: Date | null) => date && setStartTime(date)}
            disabled={isSubmitting}
          />
          
          <Select
            label="Repeat Pattern"
            description="How often should this scan repeat"
            data={[
              { value: 'none', label: 'Do not repeat' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' }
            ]}
            value={repeatPattern}
            onChange={(value: string | null) => setRepeatPattern(value || 'none')}
            disabled={isSubmitting}
          />
          
          {(repeatPattern === 'weekly' || repeatPattern === 'monthly') && (
            <MultiSelect
              label={repeatPattern === 'weekly' ? 'Days of Week' : 'Days of Month'}
              description={`Select which ${repeatPattern === 'weekly' ? 'days of the week' : 'days of the month'} to run the scan`}
              data={getDayOptions()}
              value={repeatDays}
              onChange={setRepeatDays}
              disabled={isSubmitting}
              searchable
              clearable
            />
          )}
          
          <Checkbox
            label="Active"
            description="Inactive schedules won't run automatically"
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
            disabled={isSubmitting}
          />
          
          {error && (
            <>
              <Divider />
              <Text color="red">{error}</Text>
            </>
          )}
          
          <Group justify="flex-end">
            <Button 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={isSubmitting}
              disabled={!url || isSubmitting}
            >
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
