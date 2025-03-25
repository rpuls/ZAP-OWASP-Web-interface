import { useState } from 'react';
import { 
  Table, 
  Text, 
  Paper, 
  Button, 
  Group, 
  Badge, 
  Pagination, 
  Loader, 
  Box,
  Collapse,
  Divider,
  Stack,
  rem
} from '@mantine/core';
import { IconChevronDown, IconChevronRight, IconDownload } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { getScanHistory, generateReport, ScanSummary, AlertCounts } from '../services/api';

// Format date nicely
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// Format time with hours and minutes
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

// Format duration from milliseconds to readable format
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Get status badge color based on scan status
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'active-scanning':
      return 'blue';
    case 'spider-scanning':
      return 'indigo';
    default:
      return 'gray';
  }
}

// Format status for display
function formatStatus(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'active-scanning':
      return 'Active Scanning';
    case 'spider-scanning':
      return 'Spider Scanning';
    case 'pending':
      return 'Pending';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ');
  }
}

// Render alert counts as colored badges
function AlertCountBadges({ counts }: { counts: AlertCounts }) {
  return (
    <Group gap="xs">
      {counts.high > 0 && <Badge color="red">{counts.high} High</Badge>}
      {counts.medium > 0 && <Badge color="orange">{counts.medium} Medium</Badge>}
      {counts.low > 0 && <Badge color="yellow">{counts.low} Low</Badge>}
      {counts.info > 0 && <Badge color="blue">{counts.info} Info</Badge>}
      {counts.high === 0 && counts.medium === 0 && counts.low === 0 && counts.info === 0 && (
        <Text size="sm" c="dimmed">No alerts</Text>
      )}
    </Group>
  );
}

export function ScanHistoryTable() {
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;
  
  // Fetch scan history with pagination
  const { data, isLoading, isError } = useQuery({
    queryKey: ['scanHistory', page],
    queryFn: () => getScanHistory(page, itemsPerPage),
    refetchInterval: 10000, // Refresh every 10 seconds to catch new scans
  });
  
  // Toggle row expansion
  const toggleRow = (uuid: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uuid)) {
        newSet.delete(uuid);
      } else {
        newSet.add(uuid);
      }
      return newSet;
    });
  };
  
  // Handle report download
  const handleDownloadReport = (uuid: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row toggle
    generateReport(uuid);
  };
  
  // If loading, show loader
  if (isLoading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Loader />
      </Box>
    );
  }
  
  // If error, show error message
  if (isError) {
    return (
      <Paper p="md" withBorder>
        <Text color="red">Failed to load scan history. Please try again later.</Text>
      </Paper>
    );
  }
  
  // If no scans, show empty state
  if (!data || data.scans.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text ta="center" c="dimmed">No scan history available. Run a scan to see results here.</Text>
      </Paper>
    );
  }
  
  return (
    <Stack gap={rem(16)}>
      <Paper p="md" withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 40 }}></Table.Th>
              <Table.Th>URL</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Alerts</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.scans.map((scan: ScanSummary) => (
              <>
                <Table.Tr 
                  key={scan.uuid} 
                  onClick={() => toggleRow(scan.uuid)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>
                    {expandedRows.has(scan.uuid) ? (
                      <IconChevronDown size={16} />
                    ) : (
                      <IconChevronRight size={16} />
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text truncate maw={300}>{scan.url}</Text>
                  </Table.Td>
                  <Table.Td>{formatDate(scan.startedAt)}</Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(scan.status)}>
                      {formatStatus(scan.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {scan.alertCounts && <AlertCountBadges counts={scan.alertCounts} />}
                  </Table.Td>
                </Table.Tr>
                
                {/* Expanded row details */}
                {expandedRows.has(scan.uuid) && (
                  <Table.Tr>
                    <Table.Td colSpan={5} p={0}>
                      <Collapse in={expandedRows.has(scan.uuid)}>
                        <Paper p="md" withBorder m="xs">
                          <Stack gap="sm">
                            <Group justify="space-between">
                              <Text fw={500}>Scan Details</Text>
                              <Button 
                                leftSection={<IconDownload size={16} />}
                                onClick={(e) => handleDownloadReport(scan.uuid, e)}
                                disabled={scan.status !== 'completed'}
                              >
                                Download Report
                              </Button>
                            </Group>
                            <Divider />
                            <Group>
                              <Stack gap="xs">
                                <Text size="sm">Started: {formatTime(scan.startedAt)}</Text>
                                {scan.completedAt && (
                                  <Text size="sm">Completed: {formatTime(scan.completedAt)}</Text>
                                )}
                                {scan.duration && (
                                  <Text size="sm">Duration: {formatDuration(scan.duration)}</Text>
                                )}
                              </Stack>
                              {scan.alertCounts && (
                                <Stack gap="xs" ml="xl">
                                  <Text size="sm">Total Alerts: {scan.totalAlerts}</Text>
                                  {scan.alertCounts.high > 0 && (
                                    <Text size="sm" c="red">High Risk: {scan.alertCounts.high}</Text>
                                  )}
                                  {scan.alertCounts.medium > 0 && (
                                    <Text size="sm" c="orange">Medium Risk: {scan.alertCounts.medium}</Text>
                                  )}
                                  {scan.alertCounts.low > 0 && (
                                    <Text size="sm" c="yellow">Low Risk: {scan.alertCounts.low}</Text>
                                  )}
                                  {scan.alertCounts.info > 0 && (
                                    <Text size="sm" c="blue">Informational: {scan.alertCounts.info}</Text>
                                  )}
                                </Stack>
                              )}
                            </Group>
                          </Stack>
                        </Paper>
                      </Collapse>
                    </Table.Td>
                  </Table.Tr>
                )}
              </>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
      
      {/* Pagination */}
      {data.pagination.pages > 1 && (
        <Group justify="center">
          <Pagination 
            total={data.pagination.pages} 
            value={page} 
            onChange={setPage} 
          />
        </Group>
      )}
    </Stack>
  );
}
