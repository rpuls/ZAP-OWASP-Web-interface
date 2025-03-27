import { useState } from 'react';
import { Card, Text, Group, Badge, ActionIcon, Menu, Stack, Button } from '@mantine/core';
import { IconDots, IconEdit, IconTrash, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { Schedule } from '../services/api';
import { formatDate, formatTime } from '../utils/dateUtils';

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function ScheduleCard({ schedule, onEdit, onDelete, onToggleActive }: ScheduleCardProps) {
  const [menuOpened, setMenuOpened] = useState(false);

  // Calculate estimated finish time (15 minutes after start time)
  const estimatedFinishTime = new Date(schedule.startTime.getTime() + 15 * 60 * 1000);

  // Format the repeat pattern for display
  const getRepeatText = () => {
    if (!schedule.repeatPattern || schedule.repeatPattern === 'none') {
      return 'One-time';
    }
    
    switch (schedule.repeatPattern) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return schedule.repeatPattern;
    }
  };

  return (
    <Card withBorder p="md" radius="md">
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500} size="lg" truncate>
            {schedule.name || schedule.url}
          </Text>
          <Menu
            position="bottom-end"
            opened={menuOpened}
            onChange={setMenuOpened}
          >
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item 
                leftSection={<IconEdit size={14} />}
                onClick={() => onEdit(schedule)}
              >
                Edit
              </Menu.Item>
              <Menu.Item 
                leftSection={schedule.isActive ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                onClick={() => onToggleActive(schedule.id, !schedule.isActive)}
              >
                {schedule.isActive ? 'Deactivate' : 'Activate'}
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconTrash size={14} />}
                color="red"
                onClick={() => onDelete(schedule.id)}
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="xs">
        <Group gap="xs">
          <Text size="sm" c="dimmed" w={100}>URL:</Text>
          <Text size="sm" truncate>{schedule.url}</Text>
        </Group>
        
        <Group gap="xs">
          <Text size="sm" c="dimmed" w={100}>Start time:</Text>
          <Text size="sm">{formatDate(schedule.startTime)} at {formatTime(schedule.startTime)}</Text>
        </Group>
        
        <Group gap="xs">
          <Text size="sm" c="dimmed" w={100}>Est. finish:</Text>
          <Text size="sm">{formatDate(estimatedFinishTime)} at {formatTime(estimatedFinishTime)}</Text>
        </Group>
        
        <Group gap="xs">
          <Text size="sm" c="dimmed" w={100}>Repeat:</Text>
          <Text size="sm">{getRepeatText()}</Text>
        </Group>
        
        {schedule.lastRunAt && (
          <Group gap="xs">
            <Text size="sm" c="dimmed" w={100}>Last run:</Text>
            <Text size="sm">{formatDate(schedule.lastRunAt)} at {formatTime(schedule.lastRunAt)}</Text>
          </Group>
        )}
        
        {schedule.nextRunAt && schedule.repeatPattern !== 'none' && (
          <Group gap="xs">
            <Text size="sm" c="dimmed" w={100}>Next run:</Text>
            <Text size="sm">{formatDate(schedule.nextRunAt)} at {formatTime(schedule.nextRunAt)}</Text>
          </Group>
        )}
      </Stack>

      <Group mt="md" justify="apart">
        <Badge 
          color={schedule.isActive ? 'green' : 'gray'}
          variant="light"
        >
          {schedule.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Button 
          variant="light" 
          size="xs"
          onClick={() => onEdit(schedule)}
        >
          Edit
        </Button>
      </Group>
    </Card>
  );
}
