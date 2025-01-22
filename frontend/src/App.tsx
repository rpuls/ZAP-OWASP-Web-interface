import { MantineProvider, createTheme } from '@mantine/core';
import { ScanForm } from './components/ScanForm';
import '@mantine/core/styles.css';

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
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 600,
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          ZAP OWASP Scanner
        </h1>
        <ScanForm />
      </div>
    </MantineProvider>
  );
}

export default App;
