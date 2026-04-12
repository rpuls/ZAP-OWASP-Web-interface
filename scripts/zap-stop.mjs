import { spawn } from 'node:child_process';
import process from 'node:process';

const containerName = process.env.ZAP_DOCKER_NAME || 'zap-local';
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';

const child = spawn(dockerCommand, ['stop', containerName], {
  stdio: 'inherit',
  shell: false,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(`Failed to stop '${containerName}':`, error instanceof Error ? error.message : error);
  process.exit(1);
});
