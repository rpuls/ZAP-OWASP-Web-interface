import { useState } from 'react';
import { 
  TextInput, 
  Button, 
  Group, 
  Stack, 
  Select, 
  Checkbox,
  Paper,
  Title,
  Text,
  Divider
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { Schedule, ScheduleCreateInput, ScheduleUpdateInput } from '../services/api';

const stripProtocol = (url: string): string => {
  return url.replace(/^https?:\/\//, '');
};

const extractProtocol = (url: string): 'https://' | 'http://' => {
  if (url.startsWith('http://')) {
    return 'http://';
  }

  return 'https://';
};

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
  const [url, setUrl] = useState(stripProtocol(schedule?.url || ''));
  const [protocol, setProtocol] = useState<'https://' | 'http://'>(() =>
    extractProtocol(schedule?.url || ''),
  );
  const [name, setName] = useState(schedule?.name || '');
  const [startTime, setStartTime] = useState<Date>(schedule?.startTime || new Date());
  const [repeatPattern, setRepeatPattern] = useState<string>(schedule?.repeatPattern || 'none');
  const [isActive, setIsActive] = useState(schedule?.isActive !== false);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: ScheduleCreateInput | ScheduleUpdateInput = {
      url: protocol + stripProtocol(url),
      name: name || undefined,
      startTime,
      repeatPattern: repeatPattern === 'none' ? undefined : repeatPattern,
      isActive
    };
    
    onSubmit(formData);
  };

  return (
    <Paper p="md" withBorder>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Title order={3}>{schedule ? 'Edit Schedule' : 'New Schedule'}</Title>
          
          <div>
            <Text size="sm" fw={500} mb="4">
              URL to Scan
            </Text>
            <Text size="xs" c="dimmed" mb="8">
              Enter the URL you want to scan for vulnerabilities
            </Text>
            <Group gap="xs" align="flex-start">
              <Select
                data={[
                  { value: 'https://', label: 'https://' },
                  { value: 'http://', label: 'http://' }
                ]}
                value={protocol}
                onChange={(value) => setProtocol(value as 'https://' | 'http://')}
                disabled={isSubmitting}
                style={{ width: '110px' }}
                allowDeselect={false}
              />
              <TextInput
                required
                placeholder="example.com"
                value={url}
                onChange={(e) => setUrl(stripProtocol(e.target.value))}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              />
            </Group>
          </div>
          
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
