import { MantineProvider, createTheme, Group, Stack, Text, Anchor } from '@mantine/core';
import { ScanForm } from './components/ScanForm';
import '@mantine/core/styles.css';
import zapLogo from './assets/ZAP-logo.png';
import funkytonLogo from './assets/funkyton-logo.png';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'system-ui, -apple-system, sans-serif',
});

function App() {
  return (
    <MantineProvider theme={theme}>
      <div style={{
        maxWidth: '800px',
        margin: '2rem auto',
        padding: '0 1rem',
      }}>
        <Group justify="center" align="center" mb="2rem">
          <img src={zapLogo} alt="ZAP Logo" style={{ height: '40px' }} />
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 600,
            margin: 0
          }}>
            ZAP OWASP Scanner
          </h1>
        </Group>
        <ScanForm />
        
        <Stack align="center" style={{ marginTop: '3rem' }}>
          <Group gap="xs">
            <Anchor href="https://funkyton.com/" target="_blank">Blog</Anchor>
            <Text>•</Text>
            <Anchor href="https://funkyton.com/zap-owasp-web-scan/" target="_blank">Read more about this scanner</Anchor>
            <Text>•</Text>
            <Anchor href="https://www.zaproxy.org/" target="_blank">Powered by ZAP</Anchor>
          </Group>
          <Anchor href="https://funkyton.com/" target="_blank">
            <Group gap="xs" align="center">
              <Text size="sm">Made by</Text>
              <img src={funkytonLogo} alt="Funkyton Logo" style={{ height: '30px' }} />
            </Group>
          </Anchor>
        </Stack>
      </div>
    </MantineProvider>
  );
}

export default App;
