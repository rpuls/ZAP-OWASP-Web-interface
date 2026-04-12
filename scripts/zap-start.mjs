import { spawn } from 'node:child_process';
import process from 'node:process';

const containerName = process.env.ZAP_DOCKER_NAME || 'zap-local';
const imageName = process.env.ZAP_DOCKER_IMAGE || 'zaproxy/zap-stable:latest';
const containerPort = process.env.ZAP_DOCKER_PORT || '8080';
const hostPort = process.env.ZAP_HOST_PORT || containerPort;
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
    });
  });
}

async function main() {
  let state = null;

  try {
    const result = await run(dockerCommand, ['container', 'inspect', '-f', '{{.State.Status}}', containerName]);
    state = result.stdout.trim();
  } catch {
    state = null;
  }

  if (state === 'running') {
    console.log(`ZAP container '${containerName}' is already running on port ${hostPort}.`);
    return;
  }

  if (state) {
    console.log(`Starting existing ZAP container '${containerName}'...`);
    await run(dockerCommand, ['start', containerName], { stdio: 'inherit' });
    return;
  }

  console.log(`Creating ZAP container '${containerName}'...`);
  await run(
    dockerCommand,
    [
      'run',
      '--name',
      containerName,
      '-u',
      'zap',
      '-p',
      `${hostPort}:${containerPort}`,
      '-d',
      imageName,
      'zap.sh',
      '-daemon',
      '-host',
      '0.0.0.0',
      '-port',
      containerPort,
      '-config',
      'api.disablekey=true',
      '-config',
      'api.addrs.addr.name=.*',
      '-config',
      'api.addrs.addr.regex=true',
    ],
    { stdio: 'inherit' },
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
